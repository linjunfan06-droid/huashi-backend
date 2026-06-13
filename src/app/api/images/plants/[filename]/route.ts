import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

/**
 * GET /api/images/plants/[filename]
 * 从持久化磁盘提供图片（Railway 部署用）
 * 本地开发时图片在 public/plants 目录，Next.js 自动提供
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Railway 持久化磁盘路径
    const plantsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'plants')
      : path.join(process.cwd(), 'public', 'plants')

    const filePath = path.join(plantsDir, filename)

    // 安全检查：确保文件路径在 plantsDir 内
    if (!filePath.startsWith(plantsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buffer = await readFile(filePath)

    // 根据扩展名判断 MIME 类型
    const ext = path.extname(filename).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const contentType = mimeMap[ext] || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }
}
