import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getUserIdFromRequest } from '@/lib/auth'

export const maxDuration = 120

async function callVisionAPI(
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || ''
  const apiKey = process.env.AI_API_KEY || ''
  const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'glm-4v-flash'

  if (!baseUrl || !apiKey) {
    throw new Error('AI API not configured')
  }

  const imageUrl = `data:${mimeType};base64,${base64Image}`

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Vision API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null
    if (!imageFile) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 })
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'

    let savedImagePath: string | null = null
    try {
      const ext = mimeType.split('/')[1] || 'jpeg'
      const fileName = `plant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      // Railway 持久化磁盘挂载在 /data，本地开发用 public/plants
      const plantsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'plants')
        : path.join(process.cwd(), 'public', 'plants')
      await mkdir(plantsDir, { recursive: true })
      await writeFile(path.join(plantsDir, fileName), buffer)
      savedImagePath = `/api/images/plants/${fileName}`
    } catch (imgErr) {
      console.error('Failed to save plant image:', imgErr)
    }

    const prompt = `你是一位植物学家和植物识别专家。请分析这张图片并识别其中展示的植物。请以 JSON 格式返回结果（不要 markdown 代码块，只返回纯 JSON）：{"name":"植物中文名","scientificName":"拉丁学名","family":"科属","description":"详细描述","careLight":"光照需求","careWater":"浇水需求","careTemperature":"适宜温度","careSoil":"土壤偏好","careHumidity":"湿度需求","careFertilizer":"施肥建议","careTips":"养护提示","confidence":0.85}confidence是0到1的信心度。请用中文回答。`

    const result = await callVisionAPI(prompt, base64Data, mimeType)

    if (!result) {
      return NextResponse.json({ error: 'AI 未能返回识别结果' }, { status: 500 })
    }

    let plantData: Record<string, unknown>
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      plantData = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: '解析识别结果失败', raw: result }, { status: 500 })
    }

    const plant = await db.plant.create({
      data: {
        userId,
        name: (plantData.name as string) || '未知植物',
        scientificName: (plantData.scientificName as string) || null,
        family: (plantData.family as string) || null,
        description: (plantData.description as string) || '暂无描述',
        careLight: (plantData.careLight as string) || null,
        careWater: (plantData.careWater as string) || null,
        careTemperature: (plantData.careTemperature as string) || null,
        careSoil: (plantData.careSoil as string) || null,
        careHumidity: (plantData.careHumidity as string) || null,
        careFertilizer: (plantData.careFertilizer as string) || null,
        careTips: (plantData.careTips as string) || null,
        imageUrl: savedImagePath,
        confidence: typeof plantData.confidence === 'number' ? plantData.confidence : 0,
      },
    })

    return NextResponse.json(plant, { status: 200 })
  } catch (error) {
    console.error('Plant identification error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: '植物识别失败', detail: errMsg }, { status: 500 })
  }
}