import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

// POST /api/plant/water - Log a watering event
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { plantId, note } = body

    if (!plantId || typeof plantId !== 'string') {
      return NextResponse.json(
        { error: 'plantId is required.' },
        { status: 400 }
      )
    }

    // Check if plant exists
    const plant = await db.plant.findUnique({ where: { id: plantId } })
    if (!plant) {
      return NextResponse.json(
        { error: 'Plant not found.' },
        { status: 404 }
      )
    }

    const log = await db.wateringLog.create({
      data: {
        plantId,
        note: note || null,
      },
    })

    return NextResponse.json(log, { status: 200 })
  } catch (error) {
    console.error('Watering log error:', error)
    return NextResponse.json(
      { error: 'An error occurred while logging watering.' },
      { status: 500 }
    )
  }
}

// GET /api/plant/water?plantId=xxx - Get watering logs for a plant
export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const plantId = searchParams.get('plantId')

    if (!plantId) {
      // Return all recent watering logs
      const logs = await db.wateringLog.findMany({
        orderBy: { wateredAt: 'desc' },
        take: 50,
        include: { plant: { select: { name: true } } },
      })
      return NextResponse.json(logs, { status: 200 })
    }

    const logs = await db.wateringLog.findMany({
      where: { plantId },
      orderBy: { wateredAt: 'desc' },
      take: 30,
    })

    return NextResponse.json(logs, { status: 200 })
  } catch (error) {
    console.error('Fetch watering logs error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching watering logs.' },
      { status: 500 }
    )
  }
}
