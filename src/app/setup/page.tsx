'use client'

import { useState, useEffect } from 'react'

export default function SetupPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    // 获取用户列表
    fetch('/api/admin/setup/users')
      .then(res => res.json())
      .then(data => {
        if (data.hasAdmin) {
          setHasAdmin(true)
        } else {
          setUsers(data.users || [])
        }
      })
      .catch(() => setMsg('加载失败'))
      .finally(() => setLoading(false))
  }, [])

  const setAdmin = async (userId: string, nickname: string) => {
    const btn = document.getElementById(`btn-${userId}`) as HTMLButtonElement
    if (btn) { btn.disabled = true; btn.textContent = '设置中...' }

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '设置失败')

      setMsg(`${nickname} 已成为管理员！`)
      setMsgType('success')

      setTimeout(() => { window.location.href = '/admin' }, 2000)
    } catch (err: any) {
      setMsg(err.message)
      setMsgType('error')
      if (btn) { btn.disabled = false; btn.textContent = '设为管理员' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">加载中...</p>
      </div>
    )
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800">管理员已设置</h2>
          <p className="text-gray-500 mt-2">请通过管理后台管理管理员</p>
          <a href="/admin" className="inline-block mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            进入管理后台
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-5 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl">🌿</div>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">设置管理员</h1>
          <p className="text-gray-500 mt-2 text-sm">选择一个用户设为管理员，设置后此页面将不可访问</p>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm text-white ${msgType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {msg}
          </div>
        )}

        {users.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-3">📭</div>
            <p>暂无注册用户</p>
            <p className="text-xs mt-2">请先在小程序中注册账号</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{user.nickname}</div>
                  <div className="text-sm text-gray-400">{user.phone}</div>
                  <div className="text-xs text-gray-300 mt-1">
                    🌿 {user.plantCount} 植物 · 📝 {user.postCount} 帖子
                  </div>
                </div>
                <button
                  id={`btn-${user.id}`}
                  onClick={() => setAdmin(user.id, user.nickname)}
                  className="ml-3 px-5 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  设为管理员
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
