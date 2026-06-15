import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * GET /api/post/[id]
 * 获取帖子详情，包含作者、评论列表、关联植物
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const userId = await getUserIdFromRequest(req)

    const post = await db.post.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true },
        },
        plant: {
          select: { id: true, name: true, scientificName: true, imageUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, nickname: true, avatar: true },
            },
          },
        },
        likes: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        _count: {
          select: { comments: true },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
    }

    const { likes, _count, ...rest } = post
    const postWithLiked = {
      ...rest,
      commentCount: _count.comments,
      isLiked: userId ? likes.length > 0 : false,
    }

    return NextResponse.json(postWithLiked, { status: 200 })
  } catch (error) {
    console.error('Fetch post error:', error)
    return NextResponse.json({ error: '获取帖子详情失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/post/[id]
 * 删除帖子（仅作者可删）
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

    const { id } = await params

    const post = await db.post.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
    }

    if (post.userId !== userId) {
      return NextResponse.json({ error: '只能删除自己的帖子' }, { status: 403 })
    }

    await db.post.delete({ where: { id } })

    return NextResponse.json({ message: '帖子已删除' }, { status: 200 })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json({ error: '删除帖子失败' }, { status: 500 })
  }
}
