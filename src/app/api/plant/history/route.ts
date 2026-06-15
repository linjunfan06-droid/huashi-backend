import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const plants = await db.plant.findMany({
      where: { userId },
      orderBy: {
        identifiedAt: 'desc',
      },
      include: {
        _count: {
          select: { chatMessages: true },
        },
      },
    })

    // Transform to include chatMessagesCount at top level
    const result = plants.map((plant) => ({
      ...plant,
      chatMessagesCount: plant._count.chatMessages,
      _count: undefined,
    }))

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Fetch plant history error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching plant history.' },
      { status: 500 }
    )
  }
}
