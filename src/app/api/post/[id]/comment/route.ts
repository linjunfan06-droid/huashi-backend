import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * GET /api/post/[id]/comment
 * 获取评论列表
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params

    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
    }

    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
    })

    return NextResponse.json({ comments }, { status: 200 })
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

/**
 * POST /api/post/[id]/comment
 * 发表评论
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

    const body = await req.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: '评论内容不能超过500字' }, { status: 400 })
    }

    const comment = await db.comment.create({
      data: {
        postId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: '发表评论失败' }, { status: 500 })
  }
}
