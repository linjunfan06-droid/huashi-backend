import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

export const maxDuration = 120

interface ChatRequestBody {
  message: string
  plantId?: string
  history?: Array<{ role: string; content: string }>
  stream?: boolean
}

const AI_CONFIG = {
  baseUrl: () => process.env.AI_BASE_URL || '',
  apiKey: () => process.env.AI_API_KEY || '',
  model: () => process.env.AI_MODEL || 'glm-4-flash',
}

function buildMessages(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  message: string
): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: message },
  ]
}

async function callOpenAICompat(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const { baseUrl, apiKey, model } = { baseUrl: AI_CONFIG.baseUrl(), apiKey: AI_CONFIG.apiKey(), model: AI_CONFIG.model() }

  if (!baseUrl || !apiKey) {
    throw new Error('AI API not configured')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 512 }),
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

async function callOpenAIStream(
  messages: Array<{ role: string; content: string }>
): Promise<Response> {
  const { baseUrl, apiKey, model } = { baseUrl: AI_CONFIG.baseUrl(), apiKey: AI_CONFIG.apiKey(), model: AI_CONFIG.model() }

  if (!baseUrl || !apiKey) {
    throw new Error('AI API not configured')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 512, stream: true }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI API error (${response.status}): ${errText}`)
  }

  return response
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body: ChatRequestBody = await req.json()
    const { message, plantId, history = [], stream = false } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: '请输入消息内容' }, { status: 400 })
    }

    let plant = null
    if (plantId) {
      plant = await db.plant.findUnique({ where: { id: plantId } })
    }

    let systemPrompt = `你是一位专业且友好的植物养护专家。帮助用户解决各种植物养护问题，包括植物识别、浇水、光照、土壤、肥料、病虫害、修剪繁殖等。请提供清晰、实用、具体的建议，用中文回答，回答简洁明了。`

    if (plant) {
      systemPrompt += `\n\n用户询问的植物：名称：${plant.name}，学名：${plant.scientificName || '未知'}，科属：${plant.family || '未知'}，描述：${plant.description}，光照：${plant.careLight || '未指定'}，浇水：${plant.careWater || '未指定'}，温度：${plant.careTemperature || '未指定'}，土壤：${plant.careSoil || '未指定'}，施肥：${plant.careFertilizer || '未指定'}，提示：${plant.careTips || '未指定'}。请针对此植物给出具体建议。`
    }

    const messages = buildMessages(systemPrompt, history, message)

    // 流式输出
    if (stream) {
      const aiResponse = await callOpenAIStream(messages)

      const encoder = new TextEncoder()
      let fullContent = ''

      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = aiResponse.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || !trimmed.startsWith('data: ')) continue
                const data = trimmed.slice(6).trim()
                if (data === '[DONE]') continue
                try {
                  const json = JSON.parse(data)
                  const content = json.choices?.[0]?.delta?.content
                  if (content) {
                    fullContent += content
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch (e) { /* skip partial JSON */ }
              }
            }

            // 处理buffer中剩余的数据
            if (buffer.trim()) {
              const trimmed = buffer.trim()
              if (trimmed.startsWith('data: ')) {
                const data = trimmed.slice(6).trim()
                if (data !== '[DONE]') {
                  try {
                    const json = JSON.parse(data)
                    const content = json.choices?.[0]?.delta?.content
                    if (content) {
                      fullContent += content
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                    }
                  } catch (e) { /* skip */ }
                }
              }
            }

            // 流式结束后保存到数据库
            if (fullContent) {
              await db.$transaction([
                db.chatMessage.create({ data: { plantId: plantId || null, role: 'user', content: message } }),
                db.chatMessage.create({ data: { plantId: plantId || null, role: 'assistant', content: fullContent } }),
              ])
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Stream error:', error)
            controller.error(error)
          }
        }
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 非流式（原有逻辑）
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
