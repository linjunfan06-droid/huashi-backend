import { db } from '@/lib/db'

/**
 * 从请求头中获取并验证管理员用户
 * 返回 adminUser 或 null
 */
export async function getAdminFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const user = await db.user.findUnique({ where: { token } })
  if (!user || !user.isAdmin) return null

  return user
}
