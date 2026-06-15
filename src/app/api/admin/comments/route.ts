import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('postId')

  if (!postId) {
    return NextResponse.json({ error: '缺少帖子ID' }, { status: 400 })
  }

  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, nickname: true, phone: true } },
    },
  })

  return NextResponse.json({ comments })
}

export async function DELETE(req: Request) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少评论ID' }, { status: 400 })
  }

  // 删除评论并更新帖子评论数
  const comment = await db.comment.findUnique({ where: { id } })
  if (!comment) {
    return NextResponse.json({ error: '评论不存在' }, { status: 404 })
  }

  await db.$transaction([
    db.comment.delete({ where: { id } }),
    db.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    }),
  ])

  return NextResponse.json({ message: '删除成功' })
}
