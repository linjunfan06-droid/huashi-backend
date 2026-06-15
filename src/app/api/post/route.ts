import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * GET /api/post
 * 获取帖子列表，支持分页，按时间倒序
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const skip = (page - 1) * limit

    const userId = await getUserIdFromRequest(req)

    const [posts, total] = await Promise.all([
      db.post.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, nickname: true, avatar: true },
          },
          plant: {
            select: { id: true, name: true, scientificName: true, imageUrl: true },
          },
          likes: userId
            ? { where: { userId }, select: { id: true } }
            : false,
          _count: {
            select: { comments: true },
          },
        },
      }),
      db.post.count(),
    ])

    const postsWithLiked = posts.map((post) => {
      const { likes, _count, ...rest } = post
      return {
        ...rest,
        commentCount: _count.comments,
        isLiked: userId ? likes.length > 0 : false,
      }
    })

    return NextResponse.json({
      posts: postsWithLiked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch posts error:', error)
    return NextResponse.json({ error: '获取帖子列表失败' }, { status: 500 })
  }
}

/**
 * POST /api/post
 * 发帖，需要登录
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { content, images, plantId } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: '帖子内容不能为空' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: '帖子内容不能超过2000字' }, { status: 400 })
    }

    const imagesArray = Array.isArray(images) ? images : []
    if (imagesArray.length > 9) {
      return NextResponse.json({ error: '图片不能超过9张' }, { status: 400 })
    }

    if (plantId) {
      const plant = await db.plant.findUnique({ where: { id: plantId } })
      if (!plant) {
        return NextResponse.json({ error: '关联植物不存在' }, { status: 400 })
      }
    }

    const post = await db.post.create({
      data: {
        userId,
        content: content.trim(),
        images: JSON.stringify(imagesArray),
        plantId: plantId || null,
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true },
        },
        plant: {
          select: { id: true, name: true, scientificName: true, imageUrl: true },
        },
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json({ error: '发帖失败' }, { status: 500 })
  }
}
