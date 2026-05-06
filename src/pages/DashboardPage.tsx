import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkspaceTasks } from '../api/workspaces'
import { useAuth } from '../context/AuthContext'
import { useWorkbench } from '../context/WorkbenchContext'
import { APP_NAME, APP_TAGLINE } from '../data/wensai'
import { Icon, LogoMark } from '../components/WensaiUI'

interface DashboardStats {
  total: number
  pending: number
  running: number
  completed: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { inWorkbenchPanel, openWorkbenchPanel, compactWorkbench } = useWorkbench()
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, running: 0, completed: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    void loadData()
  }, [user?.active_workspace_id])

  const loadData = async () => {
    if (!user?.active_workspace_id) {
      setStats({ total: 0, pending: 0, running: 0, completed: 0 })
      return
    }
    try {
      const allRes = await listWorkspaceTasks(user.active_workspace_id)
      const tasks = allRes.data
      setStats({
        total: tasks.length,
        pending: tasks.filter((task) => ['pending', 'queued'].includes(task.status)).length,
        running: tasks.filter((task) => ['running', 'waiting_approval', 'cancelling'].includes(task.status)).length,
        completed: tasks.filter((task) => ['completed', 'failed', 'cancelled'].includes(task.status)).length,
      })
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    }
  }

  const statCards: { label: string; value: number }[] = [
    { label: '全部任务', value: stats.total },
    { label: '待处理', value: stats.pending },
    { label: '进行中', value: stats.running },
    { label: '已完成', value: stats.completed },
  ]

  const openConversation = () => {
    if (inWorkbenchPanel) {
      openWorkbenchPanel('sandboxes')
      return
    }
    navigate('/sandboxes')
  }

  return (
    <div className="min-h-full bg-white">
      <section className={['flex min-h-[calc(100vh-40px)] flex-col', compactWorkbench ? 'px-3 pb-4 pt-5' : 'px-4 pb-6 pt-8 md:px-6'].join(' ')}>
        <div className="mx-auto hidden w-full max-w-5xl grid-cols-4 gap-3 xl:grid">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-[#f8fafc] px-4 py-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <div className={['flex flex-1 flex-col items-center justify-center text-center', compactWorkbench ? 'py-6' : 'py-10'].join(' ')}>
          <LogoMark className={compactWorkbench ? 'mx-auto h-20 w-20' : 'mx-auto h-28 w-28 md:h-32 md:w-32'} />
          <h1 className={['font-semibold text-slate-950', compactWorkbench ? 'mt-4 text-2xl' : 'mt-5 text-3xl md:text-4xl'].join(' ')}>{APP_NAME}</h1>
          <p className={['font-medium text-slate-500', compactWorkbench ? 'mt-2 text-[13px]' : 'mt-3 text-sm md:text-base'].join(' ')}>{APP_TAGLINE}</p>
          <p className="mt-2 text-sm text-slate-400">欢迎，{user?.username || '参赛团队'}</p>

          <button
            type="button"
            onClick={openConversation}
            className={[
              'mt-8 inline-flex flex-col items-center text-slate-950 backdrop-blur-2xl transition hover:border-sky-200/80 hover:from-white/48 hover:via-cyan-50/38 hover:to-sky-100/28',
              compactWorkbench
                ? 'w-full gap-3 rounded-[24px] border border-cyan-100/80 bg-linear-to-br from-white/42 via-cyan-50/30 to-sky-100/20 px-6 py-7 shadow-[0_18px_42px_rgba(125,211,252,0.12)]'
                : 'min-w-[720px] max-w-[92vw] gap-4 rounded-[32px] border border-cyan-100/80 bg-linear-to-br from-white/42 via-cyan-50/30 to-sky-100/20 px-16 py-10 shadow-[0_28px_80px_rgba(125,211,252,0.16)] hover:scale-[1.02] hover:shadow-[0_32px_90px_rgba(125,211,252,0.22)]',
            ].join(' ')}
          >
            <span className={['grid place-items-center border border-white/70 bg-linear-to-br from-cyan-200/55 via-sky-200/45 to-blue-300/55 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_30px_rgba(56,189,248,0.18)] backdrop-blur-md', compactWorkbench ? 'h-14 w-14 rounded-[18px]' : 'h-20 w-20 rounded-[24px]'].join(' ')}>
              <Icon name="send" className={compactWorkbench ? 'h-6 w-6' : 'h-9 w-9'} />
            </span>
            <span className={compactWorkbench ? 'text-lg font-semibold' : 'text-2xl font-semibold'}>快速开始</span>
            <span className={compactWorkbench ? 'text-[13px] text-slate-500' : 'text-sm text-slate-500'}>进入对话，选择沙盒并继续协作</span>
          </button>
        </div>
      </section>
    </div>
  )
}
