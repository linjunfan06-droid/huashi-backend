import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

export const maxDuration = 120

interface ChatRequestBody {
  message: string
  plantId?: string
  history?: Array<{ role: string; content: string }>
}

async function callOpenAICompat(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || ''
  const apiKey = process.env.AI_API_KEY || ''
  const model = process.env.AI_MODEL || 'glm-4-flash'

  if (!baseUrl || !apiKey) {
    throw new Error('AI API not configured')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI returned empty response')
  return content
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body: ChatRequestBody = await req.json()
    const { message, plantId, history = [] } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: '请输入消息内容' }, { status: 400 })
    }

    let plant = null
    if (plantId) {
      plant = await db.plant.findUnique({ where: { id: plantId } })
    }

    let systemPrompt = `你是一位专业且友好的植物养护专家。帮助用户解决各种植物养护问题，包括植物识别、浇水、光照、土壤、肥料、病虫害、修剪繁殖等。请提供清晰、实用、具体的建议，用中文回答。`

    if (plant) {
      systemPrompt += `\n\n用户询问的植物：名称：${plant.name}，学名：${plant.scientificName || '未知'}，科属：${plant.family || '未知'}，描述：${plant.description}，光照：${plant.careLight || '未指定'}，浇水：${plant.careWater || '未指定'}，温度：${plant.careTemperature || '未指定'}，土壤：${plant.careSoil || '未指定'}，施肥：${plant.careFertilizer || '未指定'}，提示：${plant.careTips || '未指定'}。请针对此植物给出具体建议。`
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    const assistantResponse = await callOpenAICompat(messages)

    const chatMessages = await db.$transaction([
      db.chatMessage.create({ data: { plantId: plantId || null, role: 'user', content: message } }),
      db.chatMessage.create({ data: { plantId: plantId || null, role: 'assistant', content: assistantResponse } }),
    ])

    return NextResponse.json({ response: assistantResponse, messages: chatMessages }, { status: 200 })
  } catch (error) {
    console.error('Plant chat error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'AI 服务暂不可用', detail: errMsg }, { status: 500 })
  }
}