import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * 获取用户列表（供 /setup 页面使用，无需登录）
 * 仅在没有管理员时可用
 */
export async function GET() {
  try {
    const adminCount = await db.user.count({ where: { isAdmin: true } })

    if (adminCount > 0) {
      return NextResponse.json({ hasAdmin: true })
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        nickname: true,
        createdAt: true,
        _count: { select: { plants: true, posts: true } },
      },
    })

    return NextResponse.json({
      hasAdmin: false,
      users: users.map(u => ({
        id: u.id,
        phone: u.phone,
        nickname: u.nickname,
        plantCount: u._count.plants,
        postCount: u._count.posts,
      })),
    })
  } catch (error) {
    console.error('Get setup users error:', error)
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}
