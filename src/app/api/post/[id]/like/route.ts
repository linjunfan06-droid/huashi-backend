import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * POST /api/post/[id]/like
 * 点赞
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id: postId } = await params

    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
    }

    const existing = await db.like.findUnique({
      where: { postId_userId: { postId, userId } },
    })

    if (existing) {
      return NextResponse.json({ error: '已经点赞过了' }, { status: 400 })
    }

    await db.like.create({
      data: { postId, userId },
    })

    await db.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    })

    return NextResponse.json({ message: '点赞成功' }, { status: 200 })
  } catch (error) {
    console.error('Like post error:', error)
    return NextResponse.json({ error: '点赞失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/post/[id]/like
 * 取消点赞
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id: postId } = await params

    const existing = await db.like.findUnique({
      where: { postId_userId: { postId, userId } },
    })

    if (!existing) {
      return NextResponse.json({ error: '尚未点赞' }, { status: 400 })
    }

    await db.like.delete({
      where: { postId_userId: { postId, userId } },
    })

    await db.post.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    })

    return NextResponse.json({ message: '取消点赞成功' }, { status: 200 })
  } catch (error) {
    console.error('Unlike post error:', error)
    return NextResponse.json({ error: '取消点赞失败' }, { status: 500 })
  }
}
