import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTaskEvents } from '../api/tasks'
import { listWorkspaceTasks } from '../api/workspaces'
import { EmptyState, Icon, Panel } from '../components/WensaiUI'
import { useAuth } from '../context/AuthContext'
import { useWorkbench } from '../context/WorkbenchContext'
import { copySuggestion, exportPdf, exportWord } from '../utils/export'
import { readManualSuggestions, type ManualSuggestion } from '../utils/manualSuggestions'
import type { SandboxRecord, WorkspaceTaskSummary } from '../types'

type ExportMode = 'word' | 'pdf' | 'copy'

interface SuggestionExportPageProps {
  selectedSandboxId?: number | null
}

export default function SuggestionExportPage({ selectedSandboxId }: SuggestionExportPageProps = {}) {
  const { user } = useAuth()
  const { inWorkbenchPanel, openWorkbenchPanel, compactWorkbench } = useWorkbench()
  const [sandbox, setSandbox] = useState<SandboxRecord | null>(null)
  const [suggestions, setSuggestions] = useState<ManualSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [exportMode, setExportMode] = useState<ExportMode>('word')
  const navigate = useNavigate()

  useEffect(() => {
    void loadSuggestionSource()
  }, [selectedSandboxId, user?.active_workspace_id])

  useEffect(() => {
    const handleChange = () => {
      void loadSuggestionSource()
    }
    window.addEventListener('wensai:manual-suggestions-changed', handleChange)
    return () => window.removeEventListener('wensai:manual-suggestions-changed', handleChange)
  }, [selectedSandboxId, user?.active_workspace_id])

  const loadSuggestionSource = async () => {
    const workspaceId = user?.active_workspace_id
    if (!workspaceId) {
      setSandbox(null)
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setNotice('')
    try {
      const tasksRes = await listWorkspaceTasks(workspaceId)
      const rootTasks = tasksRes.data.filter((item) => getParentTaskId(item) === null)
      const target = selectedSandboxId
        ? rootTasks.find((item) => item.id === selectedSandboxId) || null
        : rootTasks[0] || null

      if (!target) {
        setSandbox(null)
        setSuggestions([])
        return
      }

      const eventsRes = await getTaskEvents(target.id, { limit: 500 })
      const lastMessage = pickLastMessage(eventsRes.data.items) || target.prompt
      const relatedTaskIds = new Set([
        target.id,
        ...tasksRes.data.filter((item) => getParentTaskId(item) === target.id).map((item) => item.id),
      ])
      setSandbox({ ...target, lastMessage })
      setSuggestions(
        readManualSuggestions()
          .filter((item) => relatedTaskIds.has(item.task_id))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      )
    } catch (err) {
      console.error('Failed to load suggestion source', err)
      setNotice('读取沙盒建议失败，请检查后端服务或重新选择沙盒。')
      setSandbox(null)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const exportText = useMemo(
    () => buildSandboxExportText(sandbox, suggestions),
    [sandbox, suggestions],
  )

  const handleExportAction = async () => {
    if (!sandbox) return
    if (exportMode === 'word') {
      exportWord(exportText, `${sandbox.title || `沙盒-${sandbox.id}`}-导出建议`)
      setNotice('已导出 Word')
      return
    }
    if (exportMode === 'pdf') {
      exportPdf(exportText, `${sandbox.title || `沙盒-${sandbox.id}`}-导出建议`)
      setNotice('已打开 PDF 打印导出')
      return
    }
    await copySuggestion(exportText)
    setNotice('已复制导出建议')
  }

  const openHistory = () => {
    if (inWorkbenchPanel) {
      openWorkbenchPanel('history')
      return
    }
    navigate('/history')
  }

  const openConversation = () => {
    if (inWorkbenchPanel) {
      openWorkbenchPanel('sandboxes')
      return
    }
    navigate('/sandboxes')
  }

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center bg-[#f5f7fb]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
      </div>
    )
  }

  return (
    <div className={['min-h-full bg-[#f5f7fb]', compactWorkbench ? 'p-3' : 'p-4 md:p-6'].join(' ')}>
      <div className={['flex flex-col gap-4', compactWorkbench ? '' : 'md:flex-row md:items-end md:justify-between'].join(' ')}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Export Suggestions</p>
          <h1 className={['mt-1 font-semibold text-slate-950', compactWorkbench ? 'text-xl' : 'text-2xl'].join(' ')}>导出建议</h1>
          <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px] leading-6' : 'text-sm'].join(' ')}>
            {sandbox ? '只显示你在对话中手动加入导出的建议。' : '暂无当前沙盒，请先选择或创建一个沙盒。'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSuggestionSource()}
          disabled={loading}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          title="刷新"
        >
          <Icon name="refresh" className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
        </button>
      </div>

      {notice ? (
        <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          {notice}
        </div>
      ) : null}

      {!sandbox ? (
        <div className="mt-5">
          <EmptyState title="暂无沙盒" description="创建沙盒或从历史沙盒进入后，这里会显示可导出的建议内容。" />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={openHistory}
              className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              查看历史沙盒
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <Panel className="overflow-hidden">
            <div className={['border-b border-slate-200 bg-white', compactWorkbench ? 'p-4' : 'p-5'].join(' ')}>
              <div className={['flex flex-col gap-4', compactWorkbench ? '' : 'lg:flex-row lg:items-start lg:justify-between'].join(' ')}>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                      沙盒 #{sandbox.id}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {sandbox.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {sandbox.agent_type}
                    </span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-xl font-semibold text-slate-950">{sandbox.title || `沙盒 #${sandbox.id}`}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{sandbox.prompt}</p>
                </div>
              </div>
            </div>

            <div className={compactWorkbench ? 'p-4' : 'p-5'}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">手动导出建议</h3>
                  <p className="mt-1 text-sm text-slate-500">只包含你在对话栏里点击“导出”加入的内容。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    ['word', 'Word'],
                    ['pdf', 'PDF'],
                    ['copy', '复制'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setExportMode(value)}
                      className={[
                        'h-9 rounded-lg px-4 text-sm font-medium transition',
                        exportMode === value
                          ? 'bg-slate-950 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleExportAction}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-white transition hover:bg-cyan-600"
                  >
                    {exportMode === 'copy' ? '执行复制' : `导出 ${exportMode.toUpperCase()}`}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {suggestions.length > 0 ? (
                  suggestions.map((item, index) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                            建议 {index + 1}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {item.event_type}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.content}</p>
                    </article>
                  ))
                ) : (
                  <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-base font-semibold text-slate-950">暂无可导出建议</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">请回到对话页，在需要导出的消息右侧点击“导出”。</p>
                  </article>
                )}

                <article className="rounded-2xl border border-dashed border-slate-200 bg-white p-5">
                  <h4 className="text-base font-semibold text-slate-950">导出文本预览</h4>
                  <pre className="mt-3 m-0 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                    {exportText}
                  </pre>
                </article>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">下一步</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={openConversation}
                className="h-10 rounded-lg bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
              >
                回到对话
              </button>
              <button
                type="button"
                onClick={openHistory}
                className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                返回历史沙盒
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

function pickLastMessage(events: { content?: string | null; type: string }[]) {
  return [...events]
    .reverse()
    .find((event) => event.content?.trim() && !['task_created', 'task_status_changed'].includes(event.type))
    ?.content.trim()
}

function buildSandboxExportText(sandbox: SandboxRecord | null, suggestions: ManualSuggestion[]) {
  if (!sandbox) return '暂无沙盒导出内容。'
  const suggestionText = suggestions.length
    ? suggestions
        .map((item, index) =>
          [
            `${index + 1}. ${item.event_type}`,
            `时间：${new Date(item.created_at).toLocaleString()}`,
            item.content,
          ].join('\n'),
        )
        .join('\n\n')
    : '暂无手动加入的导出建议。'

  return [
    '沙盒对话导出建议',
    `沙盒：${sandbox.title || `#${sandbox.id}`}`,
    `状态：${sandbox.status}`,
    `Runtime：${sandbox.agent_type}`,
    `目标：${sandbox.prompt}`,
    '',
    suggestionText,
  ].join('\n')
}

function getParentTaskId(task: WorkspaceTaskSummary) {
  const value = task.input?.parent_task_id
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
