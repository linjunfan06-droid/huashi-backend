import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/auth/login
 * 验证码登录/注册
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone, code } = body

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 })
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '请输入6位验证码' }, { status: 400 })
    }

    // 查找验证码
    const verification = await db.verificationCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    })

    if (!verification) {
      return NextResponse.json({ error: '请先获取验证码' }, { status: 400 })
    }

    if (verification.code !== code) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 })
    }

    if (new Date() > verification.expireAt) {
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 })
    }

    // 删除已使用的验证码
    await db.verificationCode.deleteMany({ where: { phone } })

    // 查找或创建用户
    let user = await db.user.findUnique({ where: { phone } })

    if (!user) {
      user = await db.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
        },
      })
    }

    // 生成 token
    const token = crypto.randomBytes(32).toString('hex')

    // 保存 token
    await db.user.update({
      where: { id: user.id },
      data: { token },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
