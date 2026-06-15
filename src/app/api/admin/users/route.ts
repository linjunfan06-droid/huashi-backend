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
          { nickname: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            plants: true,
            posts: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
