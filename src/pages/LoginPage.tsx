import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getMe, register } from '../api/auth'
import client, { API_BASE_URL } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../data/wensai'
import { LogoMark } from '../components/WensaiUI'
import type { RegisterRequest } from '../types'

type AuthMode = 'login' | 'register'
type ConnStatus = { ok: boolean; label: string; service: string }

function resolveServiceLabel(url: string) {
  return /^(\/api|https?:\/\/(127\.0\.0\.1|localhost))/i.test(url) ? '本地服务' : '远端服务'
}

function useServerStatus(): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>({ ok: false, label: '检测中', service: '本地服务' })

  useEffect(() => {
    const url = client.defaults.baseURL || API_BASE_URL
    const service = resolveServiceLabel(url)
    setStatus({ ok: false, label: '连接中', service })
    client.get('/health', { timeout: 5000 })
      .then(() => setStatus({ ok: true, label: '已连接', service }))
      .catch(() => setStatus({ ok: false, label: '未连接', service }))
  }, [])

  return status
}

export function AuthPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState<RegisterRequest>({ username: '', password: '', invite_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginSuccess } = useAuth()
  const navigate = useNavigate()
  const server = useServerStatus()
  const isRegister = mode === 'register'

  const switchMode = (nextMode: AuthMode) => {
    setError('')
    setMode(nextMode)
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(loginForm)
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

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(registerForm)
      setLoginForm({ username: registerForm.username, password: registerForm.password })
      setRegisterForm({ username: '', password: '', invite_code: '' })
      setMode('login')
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative h-full overflow-hidden bg-[#eaf1f8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_86%_72%,rgba(34,211,238,0.14),transparent_32%)]" />
      <div className="relative grid h-full gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="hidden min-h-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/72 backdrop-blur-xl lg:flex">
          <div className="relative flex flex-1 items-center justify-center px-12">
            <div className="max-w-xl text-center">
              <LogoMark className="mx-auto h-32 w-32" />
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Competition Material Agent</p>
              <h1 className="mt-4 text-6xl font-semibold tracking-[-0.055em] text-slate-950">{APP_NAME}</h1>
              <p className="mx-auto mt-5 max-w-md text-xl font-semibold leading-8 text-slate-700">
                把赛事材料变成可执行的修改流程
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-400">
                本地桌面、团队空间、沙盒任务和导出建议统一在一个工作台里完成。
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <LogoMark className="h-14 w-14 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">WENSAI WORKSPACE</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {isRegister ? '创建账号' : `登录 ${APP_NAME}`}
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-1">
              <div className="relative grid grid-cols-2">
                <span
                  className={[
                    'absolute inset-y-0 w-1/2 rounded-xl bg-slate-950 transition-transform duration-300 ease-out',
                    isRegister ? 'translate-x-full' : 'translate-x-0',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={['relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors', !isRegister ? 'text-white' : 'text-slate-500'].join(' ')}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={['relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors', isRegister ? 'text-white' : 'text-slate-500'].join(' ')}
                >
                  注册
                </button>
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <div className="relative mt-6 overflow-hidden">
              <div
                className={[
                  'flex w-[200%] transition-transform duration-300 ease-out',
                  isRegister ? '-translate-x-1/2' : 'translate-x-0',
                ].join(' ')}
              >
                <form onSubmit={handleLogin} className="w-1/2 shrink-0 space-y-4 pr-3">
                  <AuthInput
                    label="用户名"
                    value={loginForm.username}
                    onChange={(value) => setLoginForm({ ...loginForm, username: value })}
                    placeholder="请输入用户名"
                  />
                  <AuthInput
                    label="密码"
                    type="password"
                    value={loginForm.password}
                    onChange={(value) => setLoginForm({ ...loginForm, password: value })}
                    placeholder="请输入密码"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading && !isRegister ? '登录中' : '进入工作台'}
                  </button>
                </form>

                <form onSubmit={handleRegister} className="w-1/2 shrink-0 space-y-4 pl-3">
                  <AuthInput
                    label="用户名"
                    value={registerForm.username}
                    onChange={(value) => setRegisterForm({ ...registerForm, username: value })}
                    placeholder="选择一个用户名"
                  />
                  <AuthInput
                    label="密码"
                    type="password"
                    minLength={6}
                    value={registerForm.password}
                    onChange={(value) => setRegisterForm({ ...registerForm, password: value })}
                    placeholder="至少 6 位"
                  />
                  <AuthInput
                    label="邀请码"
                    value={registerForm.invite_code}
                    onChange={(value) => setRegisterForm({ ...registerForm, invite_code: value })}
                    placeholder="输入团队或系统邀请码"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading && isRegister ? '创建中' : '创建并切换登录'}
                  </button>
                </form>
              </div>
            </div>

            <div className={`mt-6 flex items-center justify-center gap-2 text-xs ${server.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`h-2 w-2 rounded-full ${server.ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>{server.label}</span>
              <span className="text-slate-300">·</span>
              <span>{server.service}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function AuthInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  minLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  minLength?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
      <input
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
        placeholder={placeholder}
      />
    </label>
  )
}

export default function LoginPage() {
  return <AuthPage initialMode="login" />
}
