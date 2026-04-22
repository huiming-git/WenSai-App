import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, getMe } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../data/wensai'
import { LogoMark } from '../components/WensaiUI'
import client from '../api/client'

type ConnStatus = { ok: boolean; label: string; detail: string }

function useServerStatus(): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>({ ok: false, label: '检测中…', detail: '' })

  useEffect(() => {
    const url = client.defaults.baseURL || '/api'
    setStatus({ ok: false, label: '连接中…', detail: url })
    client.get('/health', { timeout: 5000 })
      .then(() => setStatus({ ok: true, label: '已连接', detail: url }))
      .catch((err) => {
        let detail: string
        if (!err.response) {
          detail = err.code === 'ECONNABORTED' ? `连接超时 (${url})` : `无法连接服务器 (${url})`
        } else {
          detail = `服务器返回 ${err.response.status} (${url})`
        }
        setStatus({ ok: false, label: '未连接', detail })
      })
  }, [])

  return status
}

export default function LoginPage() {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const { loginSuccess } = useAuth()
  const navigate = useNavigate()
  const server = useServerStatus()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ username, password })
      const token = res.data.access_token
      localStorage.setItem('token', token)
      const meRes = await getMe()
      loginSuccess(token, meRes.data)
      navigate('/')
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-full bg-[#eef3f8] p-4 lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="hidden flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-center shadow-xl shadow-slate-200/70 lg:flex">
        <LogoMark className="h-40 w-40" />
        <h1 className="mt-6 text-4xl font-semibold text-slate-950">{APP_NAME}</h1>
        <p className="mt-3 text-sm font-medium text-slate-500">Claw Your Ideas Into Reality</p>
        <p className="mt-2 text-sm text-slate-400">赛事材料修改助手</p>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-20 w-20" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">登录 {APP_NAME}</h1>
          <p className="mt-2 text-sm text-slate-500">继续你的赛事材料修改任务</p>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">用户名</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">密码</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="请输入密码"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? '登录中' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          没有账号？{' '}
          <Link to="/register" className="font-medium text-cyan-700 no-underline hover:underline">注册</Link>
        </p>

        <div className={`mt-4 flex items-center justify-center gap-1.5 text-xs ${server.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${server.ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span>{server.label}</span>
          <span className="text-slate-300">·</span>
          <span className="truncate max-w-[200px]" title={server.detail}>{server.detail}</span>
        </div>
      </div>
      </section>
    </div>
  )
}
