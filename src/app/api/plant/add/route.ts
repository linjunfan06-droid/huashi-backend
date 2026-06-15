import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      scientificName,
      family,
      description,
      careLight,
      careWater,
      careTemperature,
      careSoil,
      careHumidity,
      careFertilizer,
      careTips,
      imageUrl,
      source,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: '植物名称为必填项' }, { status: 400 })
    }

    const plant = await db.plant.create({
      data: {
        userId,
        name: name.trim(),
        scientificName: scientificName?.trim() || null,
        family: family?.trim() || null,
        description: description?.trim() || '',
        careLight: careLight?.trim() || null,
        careWater: careWater?.trim() || null,
        careTemperature: careTemperature?.trim() || null,
        careSoil: careSoil?.trim() || null,
        careHumidity: careHumidity?.trim() || null,
        careFertilizer: careFertilizer?.trim() || null,
        careTips: careTips?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        confidence: 0,
        source: 'manual',
        identifiedAt: new Date(),
      },
    })

    return NextResponse.json(plant, { status: 200 })
  } catch (error) {
    console.error('Add plant error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: '添加植物失败', detail: errMsg }, { status: 500 })
  }
}
