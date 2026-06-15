import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * POST /api/upload
 * 上传图片，保存到持久化磁盘
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、GIF、WebP 格式' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过10MB' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = file.type.split('/')[1] || 'jpeg'
    const fileName = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const postsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'posts')
      : path.join(process.cwd(), 'public', 'posts')

    await mkdir(postsDir, { recursive: true })
    await writeFile(path.join(postsDir, fileName), buffer)

    const imageUrl = `/api/images/posts/${fileName}`

    return NextResponse.json({ url: imageUrl }, { status: 200 })
  } catch (error) {
    console.error('Upload image error:', error)
    return NextResponse.json({ error: '图片上传失败' }, { status: 500 })
  }
}
