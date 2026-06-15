import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// 管理员登录 - 通过手机号验证码（复用小程序的验证码机制）
export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: '请输入手机号和验证码' }, { status: 400 })
    }

    // 验证验证码
    const verification = await db.verificationCode.findFirst({
      where: {
        phone,
        code,
        expireAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verification) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 })
    }

    // 查找用户
    const user = await db.user.findUnique({ where: { phone } })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
    }

    // 删除已使用的验证码
    await db.verificationCode.delete({ where: { id: verification.id } })

    return NextResponse.json({
      token: user.token,
      user: {
        id: user.id,
        nickname: user.nickname,
        phone: user.phone,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
