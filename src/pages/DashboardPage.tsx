import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPaper, getPapers } from '../api/papers'
import { useAuth } from '../context/AuthContext'
import {
  APP_NAME,
  APP_TAGLINE,
  COMPETITIONS,
  DEFAULT_COMMAND,
  SUGGESTION_TEMPLATES,
  TASK_CATEGORIES,
  WORKFLOW_STEPS,
} from '../data/wensai'
import { buildPaperPayload, saveLocalCommand } from '../utils/history'
import { Chip, Icon, LogoMark, Panel } from '../components/WensaiUI'
import type { Paper } from '../types'

interface DashboardStats {
  total: number
  pending: number
  under_review: number
  reviewed: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, under_review: 0, reviewed: 0 })
  const [recentPapers, setRecentPapers] = useState<Paper[]>([])
  const [competitionId, setCompetitionId] = useState<string>(COMPETITIONS[0].id)
  const [prompt, setPrompt] = useState<string>(DEFAULT_COMMAND)
  const [saving, setSaving] = useState<boolean>(false)
  const navigate = useNavigate()

  const competition = useMemo(
    () => COMPETITIONS.find((item) => item.id === competitionId) || COMPETITIONS[0],
    [competitionId],
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await getPapers({ page: 1, page_size: 5 })
      setRecentPapers(res.data.items)
      const allRes = await getPapers({ page: 1, page_size: 100 })
      const papers: Paper[] = allRes.data.items
      setStats({
        total: allRes.data.total,
        pending: papers.filter((p) => p.status === 'pending').length,
        under_review: papers.filter((p) => p.status === 'under_review').length,
        reviewed: papers.filter((p) => ['reviewed', 'accepted', 'rejected'].includes(p.status)).length,
      })
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    }
  }

  const handleStart = async () => {
    setSaving(true)
    const title = prompt.slice(0, 42) || '问赛任务'
    saveLocalCommand({ title, prompt, competition: competition.name })
    try {
      const res = await createPaper(buildPaperPayload({ title, prompt, competition }))
      navigate(`/papers/${res.data.id}`)
    } catch (err) {
      console.error('Failed to save command to backend', err)
      navigate('/history')
    } finally {
      setSaving(false)
    }
  }

  const statCards: { label: string; value: number }[] = [
    { label: '全部任务', value: stats.total },
    { label: '待处理', value: stats.pending },
    { label: '进行中', value: stats.under_review },
    { label: '已完成', value: stats.reviewed },
  ]

  return (
    <div className="min-h-full bg-white">
      <section className="flex min-h-[calc(100vh-40px)] flex-col px-4 pb-6 pt-8 md:px-6">
        <div className="mx-auto hidden w-full max-w-5xl grid-cols-4 gap-3 xl:grid">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-[#f8fafc] px-4 py-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <LogoMark className="mx-auto h-28 w-28 md:h-32 md:w-32" />
          <h1 className="mt-5 text-3xl font-semibold text-slate-950 md:text-4xl">
            {APP_NAME}
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500 md:text-base">{APP_TAGLINE}</p>
          <p className="mt-2 text-sm text-slate-400">欢迎，{user?.username || '参赛团队'}</p>

          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-100 p-1">
              {COMPETITIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCompetitionId(item.id)}
                  className={[
                    'h-10 rounded-full px-4 text-sm font-semibold transition',
                    item.id === competitionId ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-950',
                  ].join(' ')}
                >
                  {item.shortName}
                </button>
              ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {TASK_CATEGORIES.map((item, index) => (
              <Chip key={item} active={index === 2}>{item}</Chip>
            ))}
          </div>

          <Panel className="overflow-hidden bg-[#f7f8fa] p-3 shadow-none">
            <textarea
              value={prompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(event.target.value)}
              className="h-28 w-full resize-none rounded-lg border border-transparent bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-300"
              placeholder="输入消息..."
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Chip>保存历史命令</Chip>
                <Chip>支持超 100M PPT</Chip>
                <Chip>Tauri 预留</Chip>
              </div>
              <button
                type="button"
                onClick={handleStart}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? '保存中' : '发送'}
                <Icon name="send" className="h-4 w-4" />
              </button>
            </div>
          </Panel>
          <p className="mt-3 text-center text-xs text-slate-400">内容由 AI 生成，请核实重要信息。</p>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-[#f7f8fa] p-4 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">修改建议预览</h2>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                {competition.name}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SUGGESTION_TEMPLATES.map((item) => (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                      {item.level}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.content}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">任务链路</h2>
            <div className="mt-4 space-y-4">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step.label} className="flex gap-3">
                  <span
                    className={[
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                      step.done ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{step.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{step.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="mt-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">最近保存</h2>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              查看历史
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentPapers.length ? recentPapers.map((paper) => (
              <button
                key={paper.id}
                type="button"
                onClick={() => navigate(`/papers/${paper.id}`)}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                <p className="max-h-12 overflow-hidden font-medium leading-6 text-slate-900">{paper.title}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(paper.created_at).toLocaleDateString()}
                </p>
              </button>
            )) : (
              <p className="text-sm text-slate-500">暂无后端历史命令，发送任务后会自动保存。</p>
            )}
          </div>
        </Panel>
      </section>
    </div>
  )
}
