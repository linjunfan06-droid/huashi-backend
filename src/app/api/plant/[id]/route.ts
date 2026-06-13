import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params

    const plant = await db.plant.findUnique({
      where: { id },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!plant) {
      return NextResponse.json(
        { error: 'Plant not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json(plant, { status: 200 })
  } catch (error) {
    console.error('Fetch plant error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching the plant.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params

    // Check if plant exists
    const plant = await db.plant.findUnique({
      where: { id },
    })

    if (!plant) {
      return NextResponse.json(
        { error: 'Plant not found.' },
        { status: 404 }
      )
    }

    // Delete the plant (chatMessages will be set to null due to onDelete: SetNull)
    await db.plant.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Plant and associated chat messages deleted successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete plant error:', error)
    return NextResponse.json(
      { error: 'An error occurred while deleting the plant.' },
      { status: 500 }
    )
  }
}
