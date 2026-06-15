'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = ''

// ============ 工具函数 ============
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { hour12: false })
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString('zh-CN')
}

// ============ API 封装 ============
async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

// ============ 主页面 ============
export default function AdminPage() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<any>(null)
  const [page, setPage] = useState<'dashboard' | 'posts' | 'users'>('dashboard')
  // 用 refreshKey 触发子组件刷新
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('admin_token')
    const savedUser = localStorage.getItem('admin_user')
    if (saved && savedUser) {
      setToken(saved)
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const onLogin = (t: string, u: any) => {
    setToken(t)
    setUser(u)
    localStorage.setItem('admin_token', t)
    localStorage.setItem('admin_user', JSON.stringify(u))
  }

  const onLogout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  const refresh = () => setRefreshKey(k => k + 1)

  if (!token) {
    return <LoginPage onLogin={onLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌿</span>
          <h1 className="text-lg font-bold text-gray-800">花识管理后台</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={refresh}
            className="px-3 py-1 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50"
            title="刷新数据"
          >
            🔄 刷新
          </button>
          <span className="text-sm text-gray-500">{user?.nickname} ({user?.phone})</span>
          <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-700">退出</button>
        </div>
      </nav>

      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {[
            { key: 'dashboard', label: '📊 仪表盘' },
            { key: 'posts', label: '📝 帖子管理' },
            { key: 'users', label: '👤 用户管理' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setPage(tab.key as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                page === tab.key
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {page === 'dashboard' && <Dashboard token={token} refreshKey={refreshKey} />}
        {page === 'posts' && <PostsManager token={token} refreshKey={refreshKey} />}
        {page === 'users' && <UsersManager token={token} refreshKey={refreshKey} />}
      </div>
    </div>
  )
}

// ============ 登录页 ============
function LoginPage({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

  const sendCode = async () => {
    if (!phone || phone.length !== 11) { setError('请输入正确的手机号'); return }
    setSending(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '发送失败')
      if (data.code) setCode(data.code)
      setCountdown(60)
      const timer = setInterval(() => { setCountdown(c => { if (c <= 1) { clearInterval(timer); return 0 }; return c - 1 }) }, 1000)
    } catch (err: any) { setError(err.message) } finally { setSending(false) }
  }

  const handleLogin = async () => {
    if (!phone || !code) { setError('请输入手机号和验证码'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      onLogin(data.token, data.user)
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-4xl">🌿</span>
          <h2 className="text-xl font-bold text-gray-800 mt-2">花识管理后台</h2>
          <p className="text-sm text-gray-500 mt-1">请使用管理员账号登录</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}
        <div className="space-y-4">
          <input type="tel" placeholder="手机号" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" maxLength={11} />
          <div className="flex gap-2">
            <input type="text" placeholder="验证码" value={code} onChange={e => setCode(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" maxLength={6} />
            <button onClick={sendCode} disabled={sending || countdown > 0}
              className="px-4 py-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 whitespace-nowrap">
              {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '获取验证码'}
            </button>
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50">
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ 仪表盘 ============
function Dashboard({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const d = await apiFetch('/api/admin/stats', token)
      setData(d)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData, refreshKey])

  // 自动刷新：每30秒
  useEffect(() => {
    const timer = setInterval(loadData, 30000)
    return () => clearInterval(timer)
  }, [loadData])

  if (loading && !data) return <div className="text-center py-12 text-gray-400">加载中...</div>
  if (error && !data) return (
    <div className="text-center py-12">
      <p className="text-red-400 mb-3">{error}</p>
      <button onClick={loadData} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">重试</button>
    </div>
  )
  if (!data) return null

  const { stats, recentPosts } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: '总用户', value: stats.userCount, emoji: '👤', color: 'bg-blue-50 text-blue-700' },
          { label: '总帖子', value: stats.postCount, emoji: '📝', color: 'bg-green-50 text-green-700' },
          { label: '总植物', value: stats.plantCount, emoji: '🌿', color: 'bg-emerald-50 text-emerald-700' },
          { label: '总评论', value: stats.commentCount, emoji: '💬', color: 'bg-purple-50 text-purple-700' },
          { label: '今日新用户', value: stats.todayUsers, emoji: '🆕', color: 'bg-amber-50 text-amber-700' },
          { label: '今日新帖', value: stats.todayPosts, emoji: '✨', color: 'bg-pink-50 text-pink-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4`}>
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm opacity-70">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">最近帖子</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {recentPosts.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400">暂无帖子</div>
          ) : recentPosts.map((post: any) => (
            <div key={post.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate">{post.content}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {post.user?.nickname || '未知'} · {formatDate(post.createdAt)}
                </div>
              </div>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>❤️ {post._count.likes}</span>
                <span>💬 {post._count.comments}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ 帖子管理 ============
function PostsManager({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [posts, setPosts] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  // 评论弹窗
  const [showComments, setShowComments] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const loadPosts = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const data = await apiFetch(`/api/admin/posts?${params}`, token)
      setPosts(data.posts)
      setPagination(data.pagination)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [token, search])

  useEffect(() => { loadPosts() }, [loadPosts, refreshKey])

  // 自动刷新：每30秒
  useEffect(() => {
    const timer = setInterval(() => loadPosts(pagination.page), 30000)
    return () => clearInterval(timer)
  }, [loadPosts, pagination.page])

  const deletePost = async (id: string) => {
    if (!confirm('确定删除这个帖子吗？')) return
    try {
      await apiFetch(`/api/admin/posts?id=${id}`, token, { method: 'DELETE' })
      loadPosts(pagination.page)
    } catch (err: any) { alert(err.message) }
  }

  const viewComments = async (postId: string) => {
    setCommentsPostId(postId)
    setShowComments(true)
    setCommentsLoading(true)
    try {
      const data = await apiFetch(`/api/admin/comments?postId=${postId}`, token)
      setComments(data.comments || [])
    } catch (err) { console.error(err) } finally { setCommentsLoading(false) }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('确定删除这条评论吗？')) return
    try {
      await apiFetch(`/api/admin/comments?id=${commentId}`, token, { method: 'DELETE' })
      // 刷新评论列表和帖子列表
      viewComments(commentsPostId)
      loadPosts(pagination.page)
    } catch (err: any) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" placeholder="搜索帖子内容、用户昵称、手机号..." value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadPosts(1)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button onClick={() => loadPosts(1)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">搜索</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">内容</th>
              <th className="px-4 py-3 text-left font-medium">作者</th>
              <th className="px-4 py-3 text-center font-medium">❤️</th>
              <th className="px-4 py-3 text-center font-medium">💬</th>
              <th className="px-4 py-3 text-left font-medium">时间</th>
              <th className="px-4 py-3 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无帖子</td></tr>
            ) : posts.map(post => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 max-w-xs truncate">{post.content}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>{post.user?.nickname || '未知'}</div>
                  <div className="text-xs text-gray-400">{post.user?.phone}</div>
                </td>
                <td className="px-4 py-3 text-center">{post._count.likes}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => viewComments(post.id)} className="text-green-500 hover:text-green-700 hover:underline">
                    {post._count.comments}
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatShort(post.createdAt)}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button onClick={() => viewComments(post.id)} className="text-blue-500 hover:text-blue-700 text-xs">评论</button>
                  <button onClick={() => deletePost(post.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => loadPosts(pagination.page - 1)} disabled={pagination.page <= 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500">{pagination.page} / {pagination.totalPages} (共{pagination.total}条)</span>
          <button onClick={() => loadPosts(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30">下一页</button>
        </div>
      )}

      {/* 评论弹窗 */}
      {showComments && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowComments(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">评论管理</h3>
              <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {commentsLoading ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">暂无评论</div>
              ) : (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-800">{c.user?.nickname || '未知'}</span>
                          <span className="text-xs text-gray-400">{c.user?.phone}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 break-all">{c.content}</p>
                        <span className="text-xs text-gray-300 mt-1 block">{formatDate(c.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-red-400 hover:text-red-600 text-xs whitespace-nowrap px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ 用户管理 ============
function UsersManager({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [users, setUsers] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const data = await apiFetch(`/api/admin/users?${params}`, token)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [token, search])

  useEffect(() => { loadUsers() }, [loadUsers, refreshKey])

  // 自动刷新：每30秒
  useEffect(() => {
    const timer = setInterval(() => loadUsers(pagination.page), 30000)
    return () => clearInterval(timer)
  }, [loadUsers, pagination.page])

  const toggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (!confirm(`确定${currentAdmin ? '取消管理员' : '设为管理员'}吗？`)) return
    try {
      await apiFetch(`/api/admin/users/${userId}`, token, {
        method: 'PUT', body: JSON.stringify({ userId, isAdmin: !currentAdmin }),
      })
      loadUsers(pagination.page)
    } catch (err: any) { alert(err.message) }
  }

  const deleteUser = async (id: string) => {
    if (!confirm('确定删除该用户及其所有数据吗？此操作不可恢复！')) return
    try {
      await apiFetch(`/api/admin/users/${id}`, token, { method: 'DELETE' })
      loadUsers(pagination.page)
    } catch (err: any) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" placeholder="搜索昵称、手机号..." value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers(1)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button onClick={() => loadUsers(1)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">搜索</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">用户</th>
              <th className="px-4 py-3 text-left font-medium">手机号</th>
              <th className="px-4 py-3 text-center font-medium">植物</th>
              <th className="px-4 py-3 text-center font-medium">帖子</th>
              <th className="px-4 py-3 text-center font-medium">管理员</th>
              <th className="px-4 py-3 text-left font-medium">注册时间</th>
              <th className="px-4 py-3 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无用户</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.nickname}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                <td className="px-4 py-3 text-center">{u._count.plants}</td>
                <td className="px-4 py-3 text-center">{u._count.posts}</td>
                <td className="px-4 py-3 text-center">
                  {u.isAdmin ? (
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">管理员</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">普通</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatShort(u.createdAt)}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button onClick={() => toggleAdmin(u.id, u.isAdmin)}
                    className={`text-xs ${u.isAdmin ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'}`}>
                    {u.isAdmin ? '取消管理' : '设为管理'}
                  </button>
                  <button onClick={() => deleteUser(u.id)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => loadUsers(pagination.page - 1)} disabled={pagination.page <= 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500">{pagination.page} / {pagination.totalPages} (共{pagination.total}条)</span>
          <button onClick={() => loadUsers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  )
}
