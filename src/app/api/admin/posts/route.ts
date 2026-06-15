import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''

  const where = search
    ? {
        OR: [
          { content: { contains: search } },
          { user: { nickname: { contains: search } } },
          { user: { phone: { contains: search } } },
        ],
      }
    : {}

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, phone: true, avatar: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
    db.post.count({ where }),
  ])

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function DELETE(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少帖子ID' }, { status: 400 })
  }

  await db.post.delete({ where: { id } })

  return NextResponse.json({ message: '删除成功' })
}
