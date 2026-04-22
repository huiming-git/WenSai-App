import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { APP_NAME } from '../data/wensai'
import { LogoMark } from '../components/WensaiUI'
import type { RegisterRequest } from '../types'

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterRequest>({ username: '', password: '', invite_code: '' })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-full bg-[#eef3f8] p-4 lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="hidden flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-center shadow-xl shadow-slate-200/70 lg:flex">
        <LogoMark className="h-40 w-40" />
        <h1 className="mt-6 text-4xl font-semibold text-slate-950">{APP_NAME}</h1>
        <p className="mt-3 text-sm font-medium text-slate-500">Triggered anywhere, completed locally</p>
        <p className="mt-2 text-sm text-slate-400">中国创新创业赛事材料助手</p>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-20 w-20" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">创建 {APP_NAME} 账号</h1>
          <p className="mt-2 text-sm text-slate-500">开始保存你的赛事材料修改记录</p>
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
              value={form.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, username: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="选择一个用户名"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">密码</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="设置密码（至少 6 位）"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">邀请码</label>
            <input
              type="text"
              required
              value={form.invite_code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, invite_code: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="请输入邀请码"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? '创建中' : '创建账号'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          已有账号？{' '}
          <Link to="/login" className="font-medium text-cyan-700 no-underline hover:underline">登录</Link>
        </p>
      </div>
      </section>
    </div>
  )
}
