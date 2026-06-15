import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
  }

  const [
    userCount,
    postCount,
    plantCount,
    commentCount,
    todayUsers,
    todayPosts,
    recentPosts,
  ] = await Promise.all([
    db.user.count(),
    db.post.count(),
    db.plant.count(),
    db.comment.count(),
    db.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    db.post.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    db.post.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, phone: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
  ])

  return NextResponse.json({
    stats: {
      userCount,
      postCount,
      plantCount,
      commentCount,
      todayUsers,
      todayPosts,
    },
    recentPosts,
  })
}
