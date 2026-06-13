import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/auth/send-code
 * 发送验证码（开发模式直接返回验证码）
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone } = body

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 })
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expireAt = new Date(Date.now() + 5 * 60 * 1000) // 5分钟过期

    // 删除该手机号之前的验证码
    await db.verificationCode.deleteMany({ where: { phone } })

    // 保存新验证码
    await db.verificationCode.create({
      data: { phone, code, expireAt },
    })

    // 开发模式：直接返回验证码
    console.log(`[验证码] 手机号: ${phone}, 验证码: ${code}`)

    return NextResponse.json({
      message: '验证码已发送',
      // 开发模式直接返回验证码，生产环境应删除此字段
      code,
    })
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json({ error: '发送验证码失败' }, { status: 500 })
  }
}
