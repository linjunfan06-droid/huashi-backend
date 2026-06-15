import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getUserIdFromRequest } from '@/lib/auth'

/**
 * PUT /api/user/profile
 * 更新用户昵称和头像
 */
export async function PUT(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { nickname, avatar } = body

    const updateData: Record<string, string> = {}
    if (nickname && typeof nickname === 'string') {
      if (nickname.trim().length === 0 || nickname.length > 20) {
        return NextResponse.json({ error: '昵称长度1-20个字符' }, { status: 400 })
      }
      updateData.nickname = nickname.trim()
    }
    if (avatar && typeof avatar === 'string') {
      updateData.avatar = avatar
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有需要更新的内容' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, nickname: true, avatar: true, phone: true },
    })

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

/**
 * POST /api/user/avatar
 * 上传用户头像
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: '请上传头像' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、GIF、WebP 格式' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '头像大小不能超过5MB' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = file.type.split('/')[1] || 'jpeg'
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`

    const avatarsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'avatars')
      : path.join(process.cwd(), 'public', 'avatars')

    await mkdir(avatarsDir, { recursive: true })
    await writeFile(path.join(avatarsDir, fileName), buffer)

    const avatarUrl = `/api/images/avatars/${fileName}`

    // 更新用户头像
    const user = await db.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { id: true, nickname: true, avatar: true, phone: true },
    })

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error('Upload avatar error:', error)
    return NextResponse.json({ error: '头像上传失败' }, { status: 500 })
  }
}
