import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function PUT(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
  }

  const { userId, isAdmin } = await req.json()

  if (!userId || typeof isAdmin !== 'boolean') {
    return NextResponse.json({ error: '参数错误' }, { status: 400 })
  }

  // 不能取消自己的管理员权限
  if (userId === admin.id && !isAdmin) {
    return NextResponse.json({ error: '不能取消自己的管理员权限' }, { status: 400 })
  }

  const user = await db.user.update({
    where: { id: userId },
    data: { isAdmin },
  })

  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    isAdmin: user.isAdmin,
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
    return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
  }

  if (id === admin.id) {
    return NextResponse.json({ error: '不能删除自己' }, { status: 400 })
  }

  await db.user.delete({ where: { id } })

  return NextResponse.json({ message: '删除成功' })
}
