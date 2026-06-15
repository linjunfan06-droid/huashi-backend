import { Leaf } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 shadow-lg shadow-green-500/20">
          <Leaf className="h-12 w-12 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-green-800">花识</h1>
          <p className="text-green-600 mt-1">植物识别与养护助手</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-green-100 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            本项目为微信小程序应用，请在微信开发者工具中打开 <code className="bg-green-50 px-1.5 py-0.5 rounded text-green-700 text-xs">wechat-miniprogram</code> 目录运行。
          </p>
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-lg">📸</span>
              <span>拍照识别植物品种</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-lg">💬</span>
              <span>AI 智能养护问答</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-lg">🌿</span>
              <span>我的花园管理</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-green-400">后端 API 服务运行中 · Powered by Next.js</p>
      </div>
    </div>
  )
}
