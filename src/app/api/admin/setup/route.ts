import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * 初始化管理员
 * - 无 userId 参数：将当前登录用户设为管理员（仅当无管理员时）
 * - 有 userId 参数：将指定用户设为管理员（仅当无管理员时，供 /setup 页面使用）
 */
export async function POST(req: Request) {
  try {
    // 检查是否已有管理员
    const adminCount = await db.user.count({ where: { isAdmin: true } })

    if (adminCount > 0) {
      return NextResponse.json({ error: '已存在管理员，请通过管理后台设置' }, { status: 400 })
    }

    let userId: string | null = null

    // 尝试从 body 获取 userId
    try {
      const body = await req.json()
      if (body.userId) userId = body.userId
    } catch (e) { /* body 为空 */ }

    // 如果没有指定 userId，用当前登录用户
    if (!userId) {
      userId = await getUserIdFromRequest(req)
    }

    if (!userId) {
      return NextResponse.json({ error: '请先登录或指定用户' }, { status: 401 })
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { isAdmin: true },
    })

    return NextResponse.json({
      message: `${user.nickname} 已成为管理员`,
      user: {
        id: user.id,
        nickname: user.nickname,
        phone: user.phone,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    console.error('Setup admin error:', error)
    return NextResponse.json({ error: '设置失败' }, { status: 500 })
  }
}
