import { useEffect, useMemo, useState } from 'react'
import { createTask, deleteTask, getTaskEvents, startTask } from '../api/tasks'
import { listWorkspaceTasks } from '../api/workspaces'
import { Icon, Panel } from '../components/WensaiUI'
import { useAuth } from '../context/AuthContext'
import { useWorkbench } from '../context/WorkbenchContext'
import { removeManualSuggestionsForTask } from '../utils/manualSuggestions'
import type { AgentTaskEvent, SandboxRecord } from '../types'

const DEFAULT_SANDBOX_PROMPT = ''

export default function SandboxManagePage({
  selectedSandboxId,
  onSelectSandbox,
  onSandboxCreated,
}: {
  selectedSandboxId: number | null
  onSelectSandbox: (taskId: number | null, sandbox?: SandboxRecord | null) => void
  onSandboxCreated?: (taskId: number) => void
}) {
  const { user } = useAuth()
  const { compactWorkbench } = useWorkbench()
  const [sandboxes, setSandboxes] = useState<SandboxRecord[]>([])
  const [prompt, setPrompt] = useState(DEFAULT_SANDBOX_PROMPT)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SandboxRecord | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const selectedSandbox = useMemo(
    () => sandboxes.find((item) => item.id === selectedSandboxId) || null,
    [sandboxes, selectedSandboxId],
  )

  useEffect(() => {
    void loadSandboxes()
  }, [user?.active_workspace_id])

  useEffect(() => {
    const handleRefresh = () => {
      void loadSandboxes()
    }
    window.addEventListener('wensai:sandboxes-changed', handleRefresh)
    return () => window.removeEventListener('wensai:sandboxes-changed', handleRefresh)
  }, [user?.active_workspace_id])

  const loadSandboxes = async () => {
    const workspaceId = user?.active_workspace_id
    if (!workspaceId) {
      setSandboxes([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const tasksRes = await listWorkspaceTasks(workspaceId)
      const rootTasks = tasksRes.data.filter((task) => getParentTaskId(task) === null)
      const records = await Promise.all(
        rootTasks.map(async (task) => {
          let lastMessage = task.prompt
          try {
            const eventsRes = await getTaskEvents(task.id, { limit: 100 })
            const lastEvent = pickLastMessage(eventsRes.data.items)
            if (lastEvent) lastMessage = lastEvent
          } catch (err) {
            console.error(`Failed to load sandbox events for ${task.id}`, err)
          }
          return { ...task, lastMessage }
        }),
      )
      setSandboxes(records)
    } catch (err) {
      console.error('Failed to load sandbox records', err)
      setError('加载沙盒失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSandbox = async () => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await createTask({
        workspace_id: user?.active_workspace_id ?? null,
        agent_type: 'hermes_acp',
        model: 'default',
        prompt: prompt.trim(),
        dispatch: false,
        input: {
          source: 'sandbox_manage_page',
        },
      })
      await startTask(res.data.task_id)
      window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
      onSandboxCreated?.(res.data.task_id)
      setPrompt(DEFAULT_SANDBOX_PROMPT)
      await loadSandboxes()
    } catch (err) {
      console.error('Failed to create sandbox', err)
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '创建沙盒失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSandbox = (sandbox: SandboxRecord) => {
    if (submitting) return
    setDeleteTarget(sandbox)
    setDeleteConfirmText('')
  }

  const confirmDeleteSandbox = async () => {
    if (!deleteTarget || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await deleteTask(deleteTarget.id)
      removeManualSuggestionsForTask(deleteTarget.id)
      const remaining = sandboxes.filter((item) => item.id !== deleteTarget.id)
      const nextSelected = selectedSandboxId === deleteTarget.id ? remaining[0] || null : selectedSandbox
      setSandboxes(remaining)
      if (selectedSandboxId === deleteTarget.id) {
        onSelectSandbox(nextSelected?.id ?? null, nextSelected)
      }
      setDeleteTarget(null)
      setDeleteConfirmText('')
      window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
      window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      await loadSandboxes()
    } catch (err) {
      console.error('Failed to delete sandbox', err)
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail === 'Running task cannot be deleted' ? '运行中的沙盒不能删除，请先停止或等待完成。' : detail || '删除沙盒失败')
    } finally {
      setSubmitting(false)
    }
  }

  const deletePhrase = deleteTarget ? `我确定删除 ${getSandboxTitle(deleteTarget)}` : ''
  const canConfirmDelete = deleteTarget !== null && deleteConfirmText.trim() === deletePhrase

  return (
    <div className={['min-h-full bg-[#f5f7fb]', compactWorkbench ? 'p-3' : 'p-4 md:p-6'].join(' ')}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Sandbox</p>
              <h1 className={['mt-1 truncate font-semibold text-slate-950', compactWorkbench ? 'text-xl' : 'text-2xl'].join(' ')}>
                沙盒管理
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">管理当前工作空间下的沙盒，文件和对话记录跟随沙盒保存。</p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-cyan-800 sm:inline-flex">
              <Icon name="sandbox" className="h-4 w-4" />
              <span className="text-xs font-medium">{sandboxes.length} 个</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <Panel className="p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-950">当前沙盒</h2>
              <p className="mt-1 truncate text-sm text-slate-500">
                {selectedSandbox ? getSandboxTitle(selectedSandbox) : '未选择沙盒'}
              </p>
            </div>
            {selectedSandbox ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">使用中</span>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h2 className="truncate text-base font-semibold text-slate-950">工作空间沙盒</h2>
            <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">{sandboxes.length} 个</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">正在加载沙盒...</p>
            ) : sandboxes.length ? (
              sandboxes.map((sandbox) => (
                <div
                  key={sandbox.id}
                  className={[
                    'rounded-2xl border bg-white p-3 transition',
                    selectedSandboxId === sandbox.id ? 'border-cyan-200 shadow-[inset_3px_0_0_#22d3ee]' : 'border-slate-200',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                      <Icon name="sandbox" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-slate-950">{getSandboxTitle(sandbox)}</p>
                        {selectedSandboxId === sandbox.id ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">当前</span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-1 break-words text-xs leading-5 text-slate-500">{sandbox.lastMessage}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        状态：{sandbox.status} · Runtime：{sandbox.agent_type}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex min-w-0 items-center justify-end gap-2">
                    {selectedSandboxId === sandbox.id ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400"
                      >
                        当前
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => onSelectSandbox(sandbox.id, sandbox)}
                        className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-60"
                      >
                        切换
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={submitting || sandbox.status === 'queued' || sandbox.status === 'running' || sandbox.status === 'waiting_approval'}
                      onClick={() => handleDeleteSandbox(sandbox)}
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">当前工作空间还没有沙盒，先创建一个。</p>
            )}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="text-base font-semibold text-slate-950">创建新沙盒</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">输入目标后创建并切换。</p>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="mt-4 h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="请输入名称"
          />

          <button
            type="button"
            onClick={handleCreateSandbox}
            disabled={!prompt.trim() || submitting}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            创建并切换
          </button>
        </Panel>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-[520px] rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">确认删除沙盒</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  删除后，该沙盒的对话记录、事件和已上传文件记录会一起删除。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return
                  setDeleteTarget(null)
                  setDeleteConfirmText('')
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="关闭"
              >
                <Icon name="chevronRight" className="h-4 w-4 rotate-45" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <p className="text-sm font-medium text-rose-700">请输入下面这句话确认删除：</p>
              <p className="mt-2 rounded-xl bg-white px-3 py-3 font-mono text-sm font-semibold text-slate-950">
                {deletePhrase}
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={deletePhrase}
              className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirmText('')
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!canConfirmDelete || submitting}
                onClick={() => void confirmDeleteSandbox()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-200"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function getSandboxTitle(sandbox: SandboxRecord) {
  return sandbox.title || `沙盒 #${sandbox.id}`
}

function pickLastMessage(events: AgentTaskEvent[]) {
  return [...events]
    .reverse()
    .find((event) => event.content?.trim() && !['task_created', 'task_status_changed'].includes(event.type))
    ?.content.trim()
}

function getParentTaskId(record: SandboxRecord | { input?: Record<string, unknown> | null }) {
  const value = record.input?.parent_task_id
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
