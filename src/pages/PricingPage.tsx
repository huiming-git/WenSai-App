import { FormEvent, useState } from 'react'
import { redeemCode } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useWorkbench } from '../context/WorkbenchContext'
import { LogoMark, Panel } from '../components/WensaiUI'

const CREDIT_USAGE = [
  ['普通问答', '约 20 积分 / 轮'],
  ['生成图表', '约 50 积分 / 次'],
  ['安装技能', '约 100 积分 / 次'],
  ['制作 PPT', '约 700-800 积分 / 次'],
  ['制作视频', '约 2500 积分 / 次'],
]

export default function PricingPage() {
  const { user, refreshUser } = useAuth()
  const { compactWorkbench } = useWorkbench()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const credits = typeof user?.credits === 'number' ? `${user.credits.toLocaleString()} 积分` : '0 积分'

  const handleRedeem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setNotice('')
      setError('请输入积分卡密')
      return
    }

    setSubmitting(true)
    setNotice('')
    setError('')

    try {
      const res = await redeemCode(trimmedCode)
      await refreshUser()
      setCode('')
      setNotice(`${res.data.message}，本次增加 ${res.data.added.toLocaleString()} 积分`)
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '兑换失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={['min-h-full bg-[#f5f7fb]', compactWorkbench ? 'p-3' : 'p-4 md:p-6'].join(' ')}>
      <div className={['flex flex-col gap-3', compactWorkbench ? '' : 'md:flex-row md:items-end md:justify-between'].join(' ')}>
        <div>
          <h1 className={['font-semibold text-slate-950', compactWorkbench ? 'text-xl' : 'text-2xl'].join(' ')}>积分卡密兑换系统</h1>
          <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px] leading-6' : 'text-sm'].join(' ')}>使用卡密为当前个人账户充值积分。</p>
        </div>
        <div className={['flex items-center gap-4', compactWorkbench ? 'justify-between' : ''].join(' ')}>
          <div className={['rounded-lg border border-slate-200 bg-white text-right', compactWorkbench ? 'px-3 py-2.5' : 'px-4 py-3'].join(' ')}>
            <p className="text-xs text-slate-500">当前余额</p>
            <p className={['mt-1 font-semibold text-slate-950', compactWorkbench ? 'text-base' : 'text-lg'].join(' ')}>{credits}</p>
          </div>
          <LogoMark className={compactWorkbench ? 'h-11 w-11' : 'h-14 w-14'} />
        </div>
      </div>

      <div className={['mt-5 grid gap-4', compactWorkbench ? '' : 'xl:grid-cols-[420px_minmax(0,1fr)]'].join(' ')}>
        <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
          <h2 className="text-lg font-semibold text-slate-950">卡密兑换</h2>
          <form onSubmit={handleRedeem} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">积分卡密</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm uppercase tracking-[0.08em] outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                placeholder="请输入卡密"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? '兑换中' : '立即兑换'}
            </button>
          </form>

          {notice ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {user?.username === 'huiming' ? (
            <p className="mt-4 text-xs leading-5 text-slate-500">测试账号 huiming 可重复输入任意卡密增加 1000 积分。</p>
          ) : null}
        </Panel>

        <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
          <h2 className="text-lg font-semibold text-slate-950">积分消耗说明</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {CREDIT_USAGE.map(([name, cost]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0">
                <span className="text-sm font-medium text-slate-800">{name}</span>
                <span className="text-sm text-slate-500">{cost}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
