import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  approveTaskApproval,
  cancelTask,
  getTask,
  getTaskApprovals,
  getTaskEvents,
  getTaskFiles,
  rejectTaskApproval,
  taskEventsWsUrl,
} from '../api/tasks'
import { Icon, Panel } from './WensaiUI'
import type { AgentFile, AgentTask, AgentTaskEvent, Approval } from '../types'
import { hasManualSuggestion, toggleManualSuggestion } from '../utils/manualSuggestions'

const RESULT_TEXT_DRAG_TYPE = 'application/x-wensai-result-text'

const labels: Record<string, string> = {
  task_created: '任务已创建',
  task_queued: '任务已进入队列',
  task_started: '任务开始执行',
  task_status_changed: '状态变化',
  agent_runtime_started: 'Runtime 启动',
  agent_runtime_stopped: 'Runtime 停止',
  agent_thinking: '思考',
  agent_message: 'Agent 消息',
  tool_call_started: '工具开始',
  tool_call_finished: '工具完成',
  tool_call_failed: '工具失败',
  terminal_command: '终端命令',
  file_diff: '文件改动',
  file_created: '文件创建',
  file_saved: '文件保存',
  approval_required: '需要审批',
  approval_approved: '审批通过',
  approval_rejected: '审批拒绝',
  task_completed: '任务完成',
  task_failed: '任务失败',
  task_cancelled: '任务取消',
}

export default function AgentTaskConversation({
  taskId,
  embedded = false,
  onTaskChange,
}: {
  taskId: number | string
  embedded?: boolean
  onTaskChange?: (task: AgentTask | null) => void
}) {
  const [task, setTask] = useState<AgentTask | null>(null)
  const [events, setEvents] = useState<AgentTaskEvent[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [files, setFiles] = useState<AgentFile[]>([])
  const [expandedEvents, setExpandedEvents] = useState<number[]>([])
  const [manualSuggestionIds, setManualSuggestionIds] = useState<number[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: AgentTaskEvent } | null>(null)
  const eventIds = useRef(new Set<number>())
  const lastEventId = useRef<number | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const pendingApprovals = useMemo(() => approvals.filter((item) => item.status === 'pending'), [approvals])

  useEffect(() => {
    if (!taskId) return
    let ws: WebSocket | null = null
    let closed = false
    let pollTimer: number | undefined
    let latestStatus: AgentTask['status'] | null = null

    eventIds.current = new Set()
    lastEventId.current = null
    setEvents([])
    setApprovals([])
    setFiles([])
    setTask(null)
    setExpandedEvents([])
    setManualSuggestionIds([])

    const appendEvent = (event: AgentTaskEvent) => {
      if (eventIds.current.has(event.id)) return
      eventIds.current.add(event.id)
      lastEventId.current = lastEventId.current === null ? event.id : Math.max(lastEventId.current, event.id)
      setEvents((items) => [...items, event])
      if (event.type === 'task_status_changed' && typeof event.metadata.status === 'string') {
        latestStatus = event.metadata.status as AgentTask['status']
        setTask((current) => {
          const next = current ? { ...current, status: event.metadata.status as AgentTask['status'] } : current
          onTaskChange?.(next)
          return next
        })
      }
      if (event.type === 'approval_required') void refreshApprovals()
      if (event.type === 'file_created' || event.type === 'file_saved') void refreshFiles()
      if (event.type === 'task_completed' || event.type === 'task_failed' || event.type === 'task_cancelled') void refreshTask()
    }

    const refreshTask = async () => {
      const res = await getTask(taskId)
      latestStatus = res.data.status
      setTask(res.data)
      onTaskChange?.(res.data)
    }
    const refreshApprovals = async () => {
      const res = await getTaskApprovals(taskId)
      setApprovals(res.data)
    }
    const refreshFiles = async () => {
      const res = await getTaskFiles(taskId)
      setFiles(res.data)
    }
    const refreshEvents = async () => {
      const res = await getTaskEvents(taskId, lastEventId.current ? { after_event_id: lastEventId.current, limit: 500 } : { limit: 500 })
      res.data.items.forEach(appendEvent)
      setManualSuggestionIds((current) => {
        const next = new Set(current)
        res.data.items.forEach((event) => {
          if (hasManualSuggestion(taskId, event.id)) next.add(event.id)
        })
        return Array.from(next)
      })
    }
    const shouldPoll = () => !latestStatus || isLiveTaskStatus(latestStatus)
    const pollTask = async () => {
      if (closed) return
      await refreshEvents()
      await refreshTask()
      if (!shouldPoll() && pollTimer !== undefined) {
        window.clearInterval(pollTimer)
        pollTimer = undefined
      }
    }

    const load = async () => {
      await refreshTask()
      await refreshEvents()
      await refreshApprovals()
      await refreshFiles()
      ws = new WebSocket(taskEventsWsUrl(taskId))
      ws.onmessage = (message) => {
        const parsed = JSON.parse(message.data)
        if (parsed.event === 'task_event') appendEvent(parsed.data)
      }
      ws.onclose = async () => {
        if (closed) return
        await pollTask()
      }
      pollTimer = window.setInterval(() => {
        if (!shouldPoll()) {
          if (pollTimer !== undefined) window.clearInterval(pollTimer)
          pollTimer = undefined
          return
        }
        void pollTask().catch((err) => console.error('Failed to poll task timeline', err))
      }, 1500)
    }

    load().catch((err) => console.error('Failed to load task timeline', err))
    return () => {
      closed = true
      if (pollTimer !== undefined) window.clearInterval(pollTimer)
      ws?.close()
    }
  }, [taskId])

  const toggleExportSuggestion = (event: AgentTaskEvent) => {
    if (!event.content?.trim()) return
    const added = toggleManualSuggestion(taskId, event)
    setManualSuggestionIds((current) => (added ? [...current, event.id] : current.filter((id) => id !== event.id)))
    setContextMenu(null)
  }

  const openExportContextMenu = (menuEvent: React.MouseEvent, event: AgentTaskEvent) => {
    if (!event.content?.trim()) return
    menuEvent.preventDefault()
    setContextMenu({ x: menuEvent.clientX, y: menuEvent.clientY, event })
  }

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('keydown', close)
    }
  }, [contextMenu])

  useLayoutEffect(() => {
    if (!embedded) return
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [embedded, events.length, files.length, pendingApprovals.length, task?.status, task?.result, task?.error])

  const decide = async (approval: Approval, approved: boolean) => {
    if (approved) await approveTaskApproval(taskId, approval.id)
    else await rejectTaskApproval(taskId, approval.id)
    const res = await getTaskApprovals(taskId)
    setApprovals(res.data)
  }

  const cancel = async () => {
    await cancelTask(taskId)
    const res = await getTask(taskId)
    setTask(res.data)
    onTaskChange?.(res.data)
  }

  const toggleEventDetails = (eventId: number) => {
    setExpandedEvents((current) =>
      current.includes(eventId) ? current.filter((item) => item !== eventId) : [...current, eventId],
    )
  }

  const shell = embedded ? 'space-y-3' : 'mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'
  const timelinePanelClass = 'p-4'

  if (embedded) {
    const running = task ? isLiveTaskStatus(task.status) : false
    const displayPrompt = getTaskDisplayPrompt(task, taskId)
    return (
      <div className={shell}>
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-[18px] rounded-tr-md bg-[#95ec69] px-4 py-2.5 text-sm font-medium leading-6 text-slate-950 shadow-sm ring-1 ring-emerald-200/70">
            {displayPrompt}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={['h-2.5 w-2.5 rounded-full', running ? 'animate-pulse bg-cyan-500' : 'bg-slate-300'].join(' ')} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Agent Runtime</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{running ? '正在处理当前输入' : '已完成当前输入'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-right text-[11px] uppercase tracking-[0.12em] text-slate-400">状态</p>
              <p className="mt-1 text-sm text-slate-600">{task?.status || 'loading'}</p>
            </div>
          </div>
          </div>
        </div>

        {pendingApprovals.map((approval) => (
          <div key={approval.id} className="flex justify-start">
            <div className="max-w-[82%] rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">需要审批</p>
              <p className="mt-2 text-[13px] leading-6 text-amber-900">{approval.description}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => decide(approval, true)}
                  className="h-8 flex-1 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white"
                >
                  批准
                </button>
                <button
                  type="button"
                  onClick={() => decide(approval, false)}
                  className="h-8 flex-1 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-900"
                >
                  拒绝
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="space-y-3">
          {events.map((event, index) => {
            const label = labels[event.type] || event.type
            const content = (event.content || '').trim()
            const inlineSummary = content && content !== label ? content : ''
            const canExportSuggestion = Boolean(content) && !['task_created', 'task_status_changed'].includes(event.type)
            const exported = manualSuggestionIds.includes(event.id)

            return (
              <div
                key={event.id}
                className="agent-event-card flex justify-start"
                style={{ animationDelay: `${Math.min(index * 90, 720)}ms` }}
                onContextMenu={(menuEvent) => {
                  if (!canExportSuggestion) return
                  menuEvent.preventDefault()
                  setContextMenu({ x: menuEvent.clientX, y: menuEvent.clientY, event })
                }}
              >
                <div className="max-w-[82%] rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700">
                      <Icon
                        name={event.type.includes('file') ? 'file' : event.type.includes('completed') ? 'check' : 'history'}
                        className="h-3 w-3"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-[13px] font-semibold text-slate-950">{label}</p>
                            <span className="shrink-0 text-[11px] text-slate-400">{new Date(event.created_at).toLocaleTimeString()}</span>
                            {inlineSummary ? (
                              <>
                                <span className="shrink-0 text-[11px] text-slate-300">·</span>
                                <p className="truncate text-[12px] leading-5 text-slate-500">{inlineSummary}</p>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {exported ? (
                            <span className="rounded-md bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">已导出</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggleEventDetails(event.id)}
                            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title={expandedEvents.includes(event.id) ? '收起详情' : '展开详情'}
                          >
                            <Icon
                              name="chevronDown"
                              className={[
                                'h-3.5 w-3.5 transition-transform duration-200',
                                expandedEvents.includes(event.id) ? 'rotate-180' : 'rotate-0',
                              ].join(' ')}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedEvents.includes(event.id) ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="grid gap-2 text-[11px] text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          <span className="font-semibold text-slate-700">类型</span>
                          <span>{event.type}</span>
                        </div>
                        {event.seq ? (
                          <div className="flex flex-wrap gap-2">
                            <span className="font-semibold text-slate-700">序号</span>
                            <span>{event.seq}</span>
                          </div>
                        ) : null}
                      </div>
                      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[10px] leading-5 text-slate-600 ring-1 ring-slate-200">
                        {JSON.stringify(event.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}

          {running ? (
            <div className="agent-running-indicator flex justify-start">
              <div className="inline-flex max-w-[82%] items-center gap-2 rounded-[18px] border border-cyan-100 bg-white px-3 py-2.5 text-[12px] font-medium text-slate-500 shadow-sm">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-100 border-t-cyan-500" />
                <span>正在运行...</span>
              </div>
            </div>
          ) : null}

          {(task?.result || task?.error) ? (
            <div className="flex justify-start">
              <div
                className="max-w-[82%] rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                onContextMenu={(menuEvent) => openExportContextMenu(menuEvent, buildResultSuggestionEvent(taskId, task))}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">结果</p>
                <TaskResultView task={task} compact />
              </div>
            </div>
          ) : null}

          {!events.length && <p className="py-8 text-center text-[13px] text-slate-500">等待事件...</p>}
          <div ref={bottomRef} />
        </div>
        {contextMenu ? (
          <div
            className="fixed z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => toggleExportSuggestion(contextMenu.event)}
              className="flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700"
            >
              <span>{manualSuggestionIds.includes(contextMenu.event.id) ? '移出导出建议' : '加入导出建议'}</span>
              <Icon name={manualSuggestionIds.includes(contextMenu.event.id) ? 'trash' : 'suggest'} className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={shell}>
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">任务 #{taskId}</h2>
            <p className="mt-1 text-sm text-slate-500">{task?.status || 'loading'}</p>
          </div>
          <button
            type="button"
            onClick={cancel}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
          >
            取消
          </button>
        </div>

        <Panel className={timelinePanelClass}>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700">
                  <Icon
                    name={event.type.includes('file') ? 'file' : event.type.includes('completed') ? 'check' : 'history'}
                    className="h-4 w-4"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{labels[event.type] || event.type}</p>
                    <span className="text-xs text-slate-400">{new Date(event.created_at).toLocaleTimeString()}</span>
                  </div>
                  <MarkdownText className="mt-1 text-sm leading-6 text-slate-600" text={event.content || labels[event.type] || event.type} />
                </div>
              </div>
            ))}
            {!events.length && <p className="py-8 text-center text-sm text-slate-500">等待事件...</p>}
          </div>
        </Panel>
      </section>

      <aside className="space-y-4">
        {pendingApprovals.map((approval) => (
          <Panel key={approval.id} className="border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">需要审批</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">{approval.description}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => decide(approval, true)}
                className="h-9 flex-1 rounded-lg bg-slate-950 text-sm font-semibold text-white"
              >
                批准
              </button>
              <button
                type="button"
                onClick={() => decide(approval, false)}
                className="h-9 flex-1 rounded-lg border border-amber-300 text-sm font-semibold text-amber-900"
              >
                拒绝
              </button>
            </div>
          </Panel>
        ))}

        <Panel className="p-4">
          <p className="text-sm font-semibold text-slate-950">输出文件</p>
          <div className="mt-3 space-y-2">
            {files.map((file) => (
              <div key={file.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="truncate font-medium text-slate-900">{file.filename}</p>
                <p className="mt-1 text-xs text-slate-500">{file.source}</p>
              </div>
            ))}
            {!files.length && <p className="text-sm text-slate-500">暂无文件</p>}
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="text-sm font-semibold text-slate-950">结果</p>
          <TaskResultView task={task} />
        </Panel>
      </aside>
    </div>
  )
}

function TaskResultView({ task, compact = false }: { task: AgentTask | null; compact?: boolean }) {
  const result = formatTaskResult(task)

  if (!task?.error && !task?.result) {
    return <p className="mt-3 text-sm text-slate-500">暂无结果</p>
  }

  if (result.error) {
    return (
      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700">
        {result.error}
      </div>
    )
  }

  return (
    <div className={['mt-3 space-y-3', compact ? 'text-[13px]' : 'text-sm'].join(' ')}>
      {result.message ? (
        <div
          className="max-h-72 cursor-grab overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 leading-6 text-slate-800 active:cursor-grabbing"
          draggable
          title="拖到左侧文件区可创建 Markdown 文件"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'copy'
            event.dataTransfer.setData(RESULT_TEXT_DRAG_TYPE, result.message)
            event.dataTransfer.setData('text/plain', result.message)
          }}
        >
          <MarkdownText text={result.message} />
        </div>
      ) : null}

      {result.files.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">文件</p>
          <div className="mt-2 space-y-1.5">
            {result.files.map((file, index) => (
              <p key={`${file}-${index}`} className="truncate text-xs text-slate-600">
                {file}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {result.runtimeInfo.length ? (
        <div className="flex flex-wrap gap-2">
          {result.runtimeInfo.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {!result.message && !result.files.length && result.raw ? (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {result.raw}
        </pre>
      ) : null}
    </div>
  )
}

function MarkdownText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseMarkdownBlocks(text)
  return (
    <div className={['break-words', className].filter(Boolean).join(' ')}>
      {blocks.map((block, index) => {
        if (block.type === 'blank') return <div key={index} className="h-2" />
        if (block.type === 'code') {
          return (
            <pre key={index} className="my-2 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
              <code>{block.lines.join('\n')}</code>
            </pre>
          )
        }
        if (block.type === 'heading') {
          return (
            <p key={index} className="mb-2 mt-3 text-sm font-semibold text-slate-950 first:mt-0">
              {renderInlineMarkdown(block.lines[0])}
            </p>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className="my-2 list-disc space-y-1 pl-5">
              {block.lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(line)}</li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ordered-list') {
          return (
            <ol key={index} className="my-2 list-decimal space-y-1 pl-5">
              {block.lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(line)}</li>
              ))}
            </ol>
          )
        }
        return (
          <p key={index} className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">
            {renderInlineMarkdown(block.lines.join('\n'))}
          </p>
        )
      })}
    </div>
  )
}

function getTaskDisplayPrompt(task: AgentTask | null, taskId: number | string) {
  const rawPrompt = task?.input?.raw_prompt
  if (typeof rawPrompt === 'string' && rawPrompt.trim()) return rawPrompt.trim()
  if (task?.prompt?.trim()) return task.prompt.trim()
  return `任务 #${taskId}`
}

function buildResultSuggestionEvent(taskId: number | string, task: AgentTask | null): AgentTaskEvent {
  return {
    id: -1000001,
    task_id: Number(taskId),
    type: 'manual_result',
    content: taskResultToText(task),
    metadata: { result: task?.result || null, error: task?.error || null },
    created_at: task?.completed_at || task?.created_at || new Date().toISOString(),
  }
}

function isLiveTaskStatus(status: AgentTask['status']) {
  return ['pending', 'queued', 'running', 'waiting_approval', 'cancelling'].includes(status)
}

type MarkdownBlock = {
  type: 'paragraph' | 'heading' | 'list' | 'ordered-list' | 'code' | 'blank'
  lines: string[]
}

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let orderedList: string[] = []
  let code: string[] | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', lines: paragraph })
    paragraph = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push({ type: 'list', lines: list })
    list = []
  }
  const flushOrderedList = () => {
    if (!orderedList.length) return
    blocks.push({ type: 'ordered-list', lines: orderedList })
    orderedList = []
  }
  const flushOpenBlocks = () => {
    flushParagraph()
    flushList()
    flushOrderedList()
  }

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', lines: code })
        code = null
      } else {
        flushOpenBlocks()
        code = []
      }
      return
    }

    if (code) {
      code.push(line)
      return
    }

    if (!line.trim()) {
      flushOpenBlocks()
      if (blocks.at(-1)?.type !== 'blank') blocks.push({ type: 'blank', lines: [] })
      return
    }

    const heading = line.match(/^#{1,4}\s+(.+)$/)
    if (heading) {
      flushOpenBlocks()
      blocks.push({ type: 'heading', lines: [heading[1]] })
      return
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph()
      flushOrderedList()
      list.push(unordered[1])
      return
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      flushList()
      orderedList.push(ordered[1])
      return
    }

    flushList()
    flushOrderedList()
    paragraph.push(line)
  })

  if (code) blocks.push({ type: 'code', lines: code })
  flushOpenBlocks()
  return trimBlankBlocks(blocks)
}

function trimBlankBlocks(blocks: MarkdownBlock[]) {
  let start = 0
  let end = blocks.length
  while (start < end && blocks[start].type === 'blank') start += 1
  while (end > start && blocks[end - 1].type === 'blank') end -= 1
  return blocks.slice(start, end)
}

function renderInlineMarkdown(text: string) {
  const parts: Array<string | JSX.Element> = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    const token = match[0]
    const content = token.slice(2, -2)
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`${match.index}-bold`} className="font-semibold text-slate-950">
          {content}
        </strong>,
      )
    } else {
      parts.push(
        <code key={`${match.index}-code`} className="rounded bg-slate-200 px-1 py-0.5 text-[0.92em] text-slate-800">
          {token.slice(1, -1)}
        </code>,
      )
    }
    cursor = match.index + token.length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function taskResultToText(task: AgentTask | null) {
  const result = formatTaskResult(task)
  if (result.error) return result.error
  return [
    result.message,
    result.files.length ? ['输出文件', ...result.files.map((file) => `- ${file}`)].join('\n') : '',
    result.runtimeInfo.length ? `运行信息：${result.runtimeInfo.join(' · ')}` : '',
    !result.message && !result.files.length ? result.raw : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function formatTaskResult(task: AgentTask | null) {
  const parsed = parseTaskResult(task?.result)
  const message = getStringField(parsed, 'message') || (typeof parsed === 'string' ? parsed : '')
  const metadata = getObjectField(parsed, 'metadata')
  const usage = getObjectField(metadata, 'usage')
  const files = getArrayField(parsed, 'files').map(formatResultFile).filter(Boolean)
  const runtimeInfo = [
    getStringField(metadata, 'stopReason') ? `停止原因 ${getStringField(metadata, 'stopReason')}` : '',
    getNumberField(usage, 'totalTokens') ? `Tokens ${getNumberField(usage, 'totalTokens')}` : '',
  ].filter(Boolean)

  return {
    error: task?.error || '',
    message,
    files,
    runtimeInfo,
    raw: typeof parsed === 'string' ? parsed : parsed ? JSON.stringify(parsed, null, 2) : '',
  }
}

function parseTaskResult(result: AgentTask['result'] | undefined) {
  if (!result) return null
  if (typeof result !== 'string') return result
  const trimmed = result.trim()
  if (!trimmed) return ''
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return trimmed
  }
}

function getObjectField(source: unknown, key: string): Record<string, unknown> | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null
  const value = (source as Record<string, unknown>)[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function getArrayField(source: unknown, key: string): unknown[] {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []
  const value = (source as Record<string, unknown>)[key]
  return Array.isArray(value) ? value : []
}

function getStringField(source: unknown, key: string) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return ''
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function getNumberField(source: unknown, key: string) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return 0
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : 0
}

function formatResultFile(file: unknown) {
  if (typeof file === 'string') return file
  if (!file || typeof file !== 'object' || Array.isArray(file)) return ''
  const record = file as Record<string, unknown>
  const name = record.filename || record.name || record.path || record.storage_key
  return typeof name === 'string' ? name : ''
}
