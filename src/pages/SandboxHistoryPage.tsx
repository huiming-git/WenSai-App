import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteTask, getTaskEvents } from '../api/tasks'
import { listWorkspaceTasks } from '../api/workspaces'
import { EmptyState, Icon, Panel } from '../components/WensaiUI'
import { useAuth } from '../context/AuthContext'
import { useWorkbench } from '../context/WorkbenchContext'
import { removeManualSuggestionsForTask } from '../utils/manualSuggestions'
import type { AgentTaskEvent, SandboxRecord } from '../types'

interface SandboxHistoryPageProps {
  onSelectSandbox?: (taskId: number | null, sandbox?: SandboxRecord | null, conversationId?: number | null) => void
}

type HistoryFilter = 'all' | 'active' | 'done'

export default function SandboxHistoryPage({ onSelectSandbox }: SandboxHistoryPageProps = {}) {
  const { user } = useAuth()
  const { inWorkbenchPanel, openWorkbenchPanel, compactWorkbench } = useWorkbench()
  const [records, setRecords] = useState<SandboxRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [expandedSandboxIds, setExpandedSandboxIds] = useState<Record<number, boolean>>({})
  const deletingIdsRef = useRef<Set<number>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    void loadHistory()
  }, [user?.active_workspace_id])

  const loadHistory = async () => {
    const workspaceId = user?.active_workspace_id
    if (!workspaceId) {
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const tasksRes = await listWorkspaceTasks(workspaceId)
      const nextRecords = await Promise.all(
        tasksRes.data.map(async (task) => {
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
      setRecords(nextRecords)
      setExpandedSandboxIds((current) => {
        const next = { ...current }
        for (const record of nextRecords) {
          if (getParentTaskId(record) === null && next[record.id] === undefined) next[record.id] = true
        }
        return next
      })
    } catch (err) {
      console.error('Failed to load sandbox history', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const historyGroups = useMemo(() => {
    const roots = records.filter((item) => getParentTaskId(item) === null)
    const childrenByParent = new Map<number, SandboxRecord[]>()

    for (const record of records) {
      const parentId = getParentTaskId(record)
      if (parentId === null) continue
      const children = childrenByParent.get(parentId) || []
      children.push(record)
      childrenByParent.set(parentId, children)
    }

    return roots
      .map((root) => {
        const conversations = (childrenByParent.get(root.id) || []).filter((item) => matchesFilter(item, filter))
        return { sandbox: root, conversations }
      })
      .filter(({ sandbox, conversations }) => matchesFilter(sandbox, filter) || conversations.length > 0)
  }, [filter, records])

  const openRecord = (record: SandboxRecord, conversation?: SandboxRecord | null) => {
    if (inWorkbenchPanel) {
      onSelectSandbox?.(record.id, record, conversation?.id ?? null)
      openWorkbenchPanel('sandboxes')
      return
    }
    navigate(`/agent-tasks/${conversation?.id ?? record.id}`)
  }

  const openNewSandbox = () => {
    if (inWorkbenchPanel) {
      openWorkbenchPanel('new-sandbox')
      return
    }
    navigate('/agent-tasks/new')
  }

  const deleteRecord = async (record: SandboxRecord) => {
    if (deletingIdsRef.current.has(record.id)) return
    const title = record.title || `沙盒 #${record.id}`
    const confirmed = window.confirm(`确认删除「${title}」？`)
    if (!confirmed) return

    deletingIdsRef.current.add(record.id)
    setDeletingId(record.id)
    try {
      await deleteTask(record.id)
      removeManualSuggestionsForTask(record.id)
      setRecords((current) => current.filter((item) => item.id !== record.id))
      window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
    } catch (err) {
      console.error('Failed to delete sandbox history item', err)
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 404) {
        setRecords((current) => current.filter((item) => item.id !== record.id))
        window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
      } else {
        window.alert('删除失败：运行中的任务不能删除，或当前账号没有权限。')
      }
    } finally {
      deletingIdsRef.current.delete(record.id)
      setDeletingId(null)
    }
  }

  return (
    <div className={['min-h-full bg-[#f5f7fb]', compactWorkbench ? 'p-3' : 'p-4 md:p-6'].join(' ')}>
      <div className={['flex flex-col gap-4', compactWorkbench ? '' : 'md:flex-row md:items-end md:justify-between'].join(' ')}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sandbox History</p>
          <h1 className={['mt-1 font-semibold text-slate-950', compactWorkbench ? 'text-xl' : 'text-2xl'].join(' ')}>历史沙盒</h1>
          <p className={['mt-2 text-slate-500', compactWorkbench ? 'max-w-none text-[13px] leading-6' : 'text-sm'].join(' ')}>
            只显示当前工作空间里的沙盒记录，并展示最后一次对话内容。
          </p>
        </div>
        <button
          type="button"
          onClick={openNewSandbox}
          className={[
            'inline-flex items-center gap-2 self-start whitespace-nowrap rounded-lg bg-slate-950 font-semibold text-white hover:bg-slate-800',
            compactWorkbench ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-sm',
          ].join(' ')}
        >
          <Icon name="sandbox" className="h-4 w-4" />
          {compactWorkbench ? '新建' : '新建沙盒'}
        </button>
      </div>

      <Panel className={['mt-5', compactWorkbench ? 'p-3' : 'p-4'].join(' ')}>
        <div className={['flex gap-2', compactWorkbench ? 'overflow-x-auto pb-1' : 'flex-wrap'].join(' ')}>
          {([
            ['all', '全部'],
            ['active', '运行中'],
            ['done', '已结束'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={[
                'shrink-0 rounded-lg font-medium transition',
                compactWorkbench ? 'h-8 px-3 text-xs' : 'h-9 px-3 text-sm',
                filter === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            title="刷新"
          >
            <Icon name="refresh" className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
          </button>
        </div>
      </Panel>

      <div className="mt-4">
        {loading ? (
          <div className="grid min-h-[300px] place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
          </div>
        ) : historyGroups.length === 0 ? (
          <EmptyState title="暂无历史沙盒" description="创建沙盒或在当前工作空间里运行任务后，这里会显示对应记录。" />
        ) : (
          <div className="grid gap-3">
            {historyGroups.map(({ sandbox, conversations }) => {
              const expanded = expandedSandboxIds[sandbox.id] ?? true
              const latestConversation = getLatestConversation(conversations)
              return (
              <div
                key={sandbox.id}
                onClick={() => openRecord(sandbox, latestConversation)}
                className={[
                  'group cursor-pointer rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50',
                  compactWorkbench ? 'p-3' : 'p-4',
                ].join(' ')}
              >
                <div className={['flex flex-col gap-3', compactWorkbench ? '' : 'md:flex-row md:items-start md:justify-between'].join(' ')}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        工作空间
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {user?.active_workspace?.name || '个人空间'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {sandbox.status}
                      </span>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        {conversations.length} 个对话
                      </span>
                    </div>
                    <h2 className={['mt-3 font-semibold text-slate-950', compactWorkbench ? 'line-clamp-3 text-[15px] leading-7' : 'text-base'].join(' ')}>
                      {sandbox.title || `沙盒 #${sandbox.id}`}
                    </h2>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">最后一次对话</p>
                    <p className={['mt-2 max-w-4xl text-slate-500', compactWorkbench ? 'line-clamp-3 text-[13px] leading-6' : 'text-sm leading-6'].join(' ')}>
                      {getSandboxLastMessage(sandbox, conversations)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={['text-slate-400', compactWorkbench ? 'text-[11px]' : 'text-xs'].join(' ')}>
                      {sandbox.created_at ? new Date(sandbox.created_at).toLocaleString() : '刚刚'}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setExpandedSandboxIds((current) => ({ ...current, [sandbox.id]: !expanded }))
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                      title={expanded ? '收起对话' : '展开对话'}
                    >
                      <Icon name="chevronDown" className={['h-4 w-4 transition-transform', expanded ? 'rotate-180' : 'rotate-0'].join(' ')} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void deleteRecord(sandbox)
                      }}
                      disabled={deletingId === sandbox.id}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-white font-semibold text-rose-500 opacity-80 transition',
                        'hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50',
                        compactWorkbench ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs',
                      ].join(' ')}
                      title="删除"
                    >
                      <Icon name={deletingId === sandbox.id ? 'refresh' : 'trash'} className={['h-3.5 w-3.5', deletingId === sandbox.id ? 'animate-spin' : ''].join(' ')} />
                      删除
                    </button>
                  </div>
                </div>
                {expanded ? (
                  <div
                    className={[
                      'mt-4 border-t border-slate-100',
                      compactWorkbench ? 'pt-3' : 'pt-4',
                    ].join(' ')}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Conversations</p>
                      <span className="text-xs text-slate-400">{conversations.length} 条</span>
                    </div>
                    {conversations.length ? (
                      <div className="grid gap-2">
                        {conversations.map((conversation) => (
                          <div
                            key={conversation.id}
                            onClick={() => openRecord(sandbox, conversation)}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-cyan-200 hover:bg-white"
                          >
                            <Icon name="message" className="h-4 w-4 shrink-0 text-cyan-700" />
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900">{conversation.title || `对话 #${conversation.id}`}</p>
                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">{conversation.status}</span>
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || conversation.prompt || '暂无对话内容'}</p>
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {conversation.created_at ? new Date(conversation.created_at).toLocaleString() : '刚刚'}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void deleteRecord(conversation)
                              }}
                              disabled={deletingId === conversation.id}
                              className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50"
                              title="删除对话"
                            >
                              <Icon
                                name={deletingId === conversation.id ? 'refresh' : 'trash'}
                                className={['h-3.5 w-3.5', deletingId === conversation.id ? 'animate-spin' : ''].join(' ')}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-400">
                        这个沙盒还没有追加对话。
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
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

function matchesFilter(record: SandboxRecord, filter: HistoryFilter) {
  if (filter === 'active') return ['pending', 'queued', 'running', 'waiting_approval', 'cancelling'].includes(record.status)
  if (filter === 'done') return ['completed', 'failed', 'cancelled'].includes(record.status)
  return true
}

function getSandboxLastMessage(sandbox: SandboxRecord, conversations: SandboxRecord[]) {
  const latestConversation = getLatestConversation(conversations)
  return latestConversation?.lastMessage || latestConversation?.prompt || sandbox.lastMessage || sandbox.prompt || '暂无对话内容'
}

function getLatestConversation(conversations: SandboxRecord[]) {
  return [...conversations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null
}
