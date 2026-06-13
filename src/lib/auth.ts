import { db } from '@/lib/db'

/**
 * 从请求头中获取并验证用户
 * 返回 userId 或 null
 */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const user = await db.user.findUnique({ where: { token } })
  return user?.id || null
}
