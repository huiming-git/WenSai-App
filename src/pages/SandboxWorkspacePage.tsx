import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cancelTask, createTask, deleteTask, getTask, getTaskEvents, startTask } from '../api/tasks'
import { listWorkspaceTasks } from '../api/workspaces'
import AgentTaskConversation from '../components/AgentTaskConversation'
import { Icon, Panel } from '../components/WensaiUI'
import { useAuth } from '../context/AuthContext'
import { removeManualSuggestionsForTask } from '../utils/manualSuggestions'
import {
  getActiveSandboxFileDrag,
  hasSandboxFileDragData,
  readSandboxFileDragData,
  type SandboxFileDragPayload,
} from '../utils/sandboxFileDrag'
import type { AgentTask, AgentTaskEvent, SandboxRecord } from '../types'

type ConversationMode = 'ask' | 'agent'

interface QueuedConversationMessage {
  id: string
  rawPrompt: string
  attachedFiles: ConversationAttachment[]
  mode: ConversationMode
  agentType: string
  model: string
  effort: string
}

type ConversationAttachment = SandboxFileDragPayload

const MODEL_OPTIONS = [
  { value: 'deepseek-v4', label: 'DeepSeek V4' },
  { value: 'gpt-5.5', label: 'GPT-5.5' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'default', label: 'Default' },
]

const AGENT_OPTIONS = [
  { value: 'hermes_acp', label: 'Hermes ACP' },
]

const EFFORT_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const MODE_OPTIONS = [
  { value: 'ask', label: 'Ask' },
  { value: 'agent', label: 'Agent' },
]

const CONVERSATION_RAIL_COLLAPSED_KEY = 'wensai.conversationRailCollapsed'
const CONVERSATION_RAIL_WIDTH_KEY = 'wensai.conversationRailWidth'
const MIN_CONVERSATION_RAIL_WIDTH = 180
const MAX_CONVERSATION_RAIL_WIDTH = 420
const DEFAULT_CONVERSATION_RAIL_WIDTH = 220
const CONVERSATION_INPUT_HEIGHT_KEY = 'wensai.conversationInputHeight'
const MIN_CONVERSATION_INPUT_HEIGHT = 56
const MAX_CONVERSATION_INPUT_HEIGHT = 320
const DEFAULT_CONVERSATION_INPUT_HEIGHT = 72

interface SandboxWorkspacePageProps {
  selectedTaskId?: number | null
  targetConversationId?: number | null
  targetConversationNonce?: number
  onSelectTaskId?: (taskId: number | null, sandbox?: SandboxRecord | null, conversationId?: number | null) => void
}

export default function SandboxWorkspacePage({
  selectedTaskId: controlledSelectedTaskId,
  targetConversationId,
  targetConversationNonce = 0,
  onSelectTaskId,
}: SandboxWorkspacePageProps = {}) {
  const { user } = useAuth()
  const [sandboxes, setSandboxes] = useState<SandboxRecord[]>([])
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<number | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<ConversationAttachment[]>([])
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [conversationMode, setConversationMode] = useState<ConversationMode>('agent')
  const [agentType, setAgentType] = useState('hermes_acp')
  const [model, setModel] = useState('gpt-5.5')
  const [effort, setEffort] = useState('medium')
  const [displayedTaskState, setDisplayedTaskState] = useState<AgentTask | null>(null)
  const [queuedMessages, setQueuedMessages] = useState<QueuedConversationMessage[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [conversationRailCollapsed, setConversationRailCollapsed] = useState(() => {
    try {
      return localStorage.getItem(CONVERSATION_RAIL_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [conversationRailWidth, setConversationRailWidth] = useState(() => readStoredConversationRailWidth())
  const [resizingConversationRail, setResizingConversationRail] = useState(false)
  const queueSendingRef = useRef(false)
  const targetConversationRef = useRef<HTMLDivElement | null>(null)
  const conversationScrollRef = useRef<HTMLDivElement | null>(null)
  const conversationGridRef = useRef<HTMLDivElement | null>(null)
  const conversationRailResizeRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const selectedTaskId = controlledSelectedTaskId ?? internalSelectedTaskId
  const previousSelectedTaskIdRef = useRef<number | null>(selectedTaskId)

  useEffect(() => {
    const appendDraft = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string }>).detail
      const text = detail?.text?.trim()
      if (!text) return
      setDraft((current) => (current.trim() ? `${current.trimEnd()}\n${text}` : text))
    }
    window.addEventListener('wensai:append-conversation-draft', appendDraft)
    return () => window.removeEventListener('wensai:append-conversation-draft', appendDraft)
  }, [])

  const selectedSandbox = useMemo(
    () => sandboxes.find((item) => item.id === selectedTaskId) || null,
    [sandboxes, selectedTaskId],
  )
  const displayedTaskId = selectedConversationId
  const displayedTaskRecord = useMemo(
    () => sandboxes.find((item) => item.id === displayedTaskId) || null,
    [displayedTaskId, sandboxes],
  )
  const displayedTaskRunning = isLiveTaskStatus(displayedTaskState?.status || displayedTaskRecord?.status || '')

  const conversationItems = useMemo(
    () => {
      if (!selectedTaskId) return []
      return sandboxes.filter((item) => getParentTaskId(item) === selectedTaskId && getThreadId(item) === null)
    },
    [sandboxes, selectedTaskId],
  )
  const visibleConversationCount = conversationItems.length + (creatingConversation ? 1 : 0)
  const displayedThreadTasks = useMemo(() => {
    if (!displayedTaskId) return []
    const threadId = selectedThreadId ?? displayedTaskId
    const tasks = sandboxes.filter((item) => item.id === threadId || getThreadId(item) === threadId)
    if (!tasks.some((item) => item.id === displayedTaskId)) {
      const displayed = sandboxes.find((item) => item.id === displayedTaskId)
      if (displayed) tasks.push(displayed)
    }
    return tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [displayedTaskId, sandboxes, selectedThreadId])

  const applySelectedTask = (taskId: number | null, sandbox?: SandboxRecord | null, conversationId?: number | null) => {
    setCreatingConversation(false)
    if (!conversationId) {
      setSelectedConversationId(null)
      setSelectedThreadId(null)
    }
    if (controlledSelectedTaskId === undefined) {
      setInternalSelectedTaskId(taskId)
    }
    onSelectTaskId?.(taskId, sandbox ?? (sandboxes.find((item) => item.id === taskId) || null), conversationId ?? null)
  }

  useEffect(() => {
    void loadSandboxes()
  }, [user?.active_workspace_id])

  useEffect(() => {
    if (previousSelectedTaskIdRef.current === selectedTaskId) return
    previousSelectedTaskIdRef.current = selectedTaskId
    setCreatingConversation(false)
    setDraft('')
    setDisplayedTaskState(null)
    if (!targetConversationId) {
      setSelectedConversationId(null)
      setSelectedThreadId(null)
    }
  }, [selectedTaskId, targetConversationId])

  useEffect(() => {
    if (!targetConversationId || !sandboxes.length) return
    const target = sandboxes.find((item) => item.id === targetConversationId)
    if (!target) return
    const parentId = getParentTaskId(target)
    if (selectedTaskId && parentId !== selectedTaskId) return
    setCreatingConversation(false)
    setSelectedThreadId(getThreadId(target) ?? target.id)
    setSelectedConversationId(target.id)
    setDisplayedTaskState(null)
  }, [sandboxes, selectedTaskId, targetConversationId, targetConversationNonce])

  useEffect(() => {
    if (displayedTaskRunning || submitting || queueSendingRef.current || !queuedMessages.length) return
    const [nextMessage] = queuedMessages
    setQueuedMessages((current) => current.slice(1))
    void sendQueuedMessage(nextMessage)
  }, [displayedTaskRunning, queuedMessages.length, submitting])

  useLayoutEffect(() => {
    if (!targetConversationId || !displayedThreadTasks.some((item) => item.id === targetConversationId)) return
    targetConversationRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [displayedThreadTasks, targetConversationId, targetConversationNonce])

  useLayoutEffect(() => {
    if (!displayedTaskId || targetConversationId) return
    const container = conversationScrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [displayedTaskId, displayedThreadTasks.length, targetConversationId])

  useEffect(() => {
    try {
      localStorage.setItem(CONVERSATION_RAIL_COLLAPSED_KEY, conversationRailCollapsed ? '1' : '0')
    } catch {
      // Ignore private storage errors; collapse state is a UI preference.
    }
  }, [conversationRailCollapsed])

  useEffect(() => {
    try {
      localStorage.setItem(CONVERSATION_RAIL_WIDTH_KEY, String(conversationRailWidth))
    } catch {
      // Ignore private storage errors; width is a UI preference.
    }
  }, [conversationRailWidth])

  useEffect(() => {
    if (!resizingConversationRail) return
    const grid = conversationGridRef.current
    let frame = 0
    let latestWidth = conversationRailWidth

    const setLiveWidth = (width: number) => {
      latestWidth = width
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        grid?.style.setProperty('--wensai-conversation-rail-width', `${latestWidth}px`)
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = conversationRailResizeRef.current
      if (!resizeState) return
      const nextWidth = resizeState.startWidth + resizeState.startX - event.clientX
      setLiveWidth(clampConversationRailWidth(nextWidth))
    }
    const stopResize = () => {
      if (frame) window.cancelAnimationFrame(frame)
      grid?.style.setProperty('--wensai-conversation-rail-width', `${latestWidth}px`)
      conversationRailResizeRef.current = null
      setResizingConversationRail(false)
      setConversationRailWidth(latestWidth)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize, { once: true })
    window.addEventListener('pointercancel', stopResize, { once: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingConversationRail, conversationRailWidth])

  const startConversationRailResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (conversationRailCollapsed) return
    event.preventDefault()
    conversationRailResizeRef.current = { startX: event.clientX, startWidth: conversationRailWidth }
    setResizingConversationRail(true)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

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
      const records = await Promise.all(
        tasksRes.data.map(async (task) => {
          let lastMessage = task.prompt
          try {
            const eventsRes = await getTaskEvents(task.id, { limit: 100 })
            const lastEvent = pickLastMessage(eventsRes.data.items)
            if (lastEvent) lastMessage = lastEvent
          } catch (err) {
            console.error(`Failed to load task events for ${task.id}`, err)
          }

          return { ...task, lastMessage }
        }),
      )
      setSandboxes(records)
      const currentRecord = records.find((item) => item.id === selectedTaskId) || null
      const currentParentId = currentRecord ? getParentTaskId(currentRecord) : null
      const nextSelectedTaskId = currentParentId && records.some((item) => item.id === currentParentId)
        ? currentParentId
        : records.some((item) => item.id === selectedTaskId)
          ? selectedTaskId
          : records.find((item) => getParentTaskId(item) === null)?.id ?? records[0]?.id ?? null
      applySelectedTask(
        nextSelectedTaskId,
        records.find((item) => item.id === nextSelectedTaskId) || null,
        targetConversationId ?? null,
      )
    } catch (err) {
      console.error('Failed to load sandboxes', err)
      setError('加载沙盒失败')
    } finally {
      setLoading(false)
    }
  }

  const sendFollowUp = async (queuedMessage?: QueuedConversationMessage) => {
    const currentAttachedFiles = queuedMessage?.attachedFiles ?? attachedFiles
    const rawPrompt = (queuedMessage?.rawPrompt ?? draft.trim()) || (currentAttachedFiles.length ? '请阅读我附加的文件。' : '')
    if (!rawPrompt || submitting || !selectedSandbox) return
    setSubmitting(true)
    setError('')
    try {
      const nextAttachedFiles = currentAttachedFiles
      const continuingThreadId = !creatingConversation && selectedThreadId ? selectedThreadId : null
      const nextMode = queuedMessage?.mode ?? conversationMode
      const nextAgentType = queuedMessage?.agentType ?? agentType
      const nextModel = queuedMessage?.model ?? model
      const nextEffort = queuedMessage?.effort ?? effort
      const promptWithFiles = appendAttachedFilesToPrompt(rawPrompt, nextAttachedFiles)
      const prompt = nextMode === 'ask' || creatingConversation ? promptWithFiles : buildFollowUpPrompt(selectedSandbox, promptWithFiles)
      const input = {
        parent_task_id: selectedSandbox.id,
        run_mode: nextMode,
        effort: nextEffort,
        raw_prompt: rawPrompt,
        workspace_file_ids: nextAttachedFiles.map((file) => file.id),
        attached_sandbox_files: nextAttachedFiles.map((file) => ({
          id: file.id,
          task_id: file.task_id,
          filename: file.filename,
          size: file.size,
          mime_type: file.mime_type,
          source: file.source,
        })),
        ...(continuingThreadId ? { thread_id: continuingThreadId } : {}),
        source: creatingConversation ? 'sandbox_workspace_new_conversation' : 'sandbox_workspace_follow_up',
      }
      const res = await createTask({
        workspace_id: user?.active_workspace_id ?? null,
        agent_type: nextAgentType || selectedSandbox?.agent_type || 'hermes_acp',
        model: nextModel,
        prompt,
        dispatch: false,
        input,
      })
      const startRes = await startTask(res.data.task_id)
      window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
      const nextThreadId = continuingThreadId ?? res.data.task_id
      const optimisticRecord: SandboxRecord = {
        ...selectedSandbox,
        id: res.data.task_id,
        title: rawPrompt,
        prompt,
        status: (startRes.data.status || 'queued') as AgentTask['status'],
        agent_type: nextAgentType || selectedSandbox.agent_type || 'hermes_acp',
        model: nextModel,
        input,
        created_at: new Date().toISOString(),
        lastMessage: rawPrompt,
      }
      setDraft('')
      setAttachedFiles([])
      setCreatingConversation(false)
      setSandboxes((current) => [optimisticRecord, ...current.filter((item) => item.id !== optimisticRecord.id)])
      setSelectedConversationId(res.data.task_id)
      setSelectedThreadId(nextThreadId)
      setDisplayedTaskState(null)
    } catch (err) {
      console.error('Failed to send sandbox follow-up', err)
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  const queueCurrentDraft = () => {
    const rawPrompt = draft.trim() || (attachedFiles.length ? '请阅读我附加的文件。' : '')
    if (!rawPrompt) return
    setQueuedMessages((current) => [
      ...current,
      {
        id: `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        rawPrompt,
        attachedFiles,
        mode: conversationMode,
        agentType,
        model,
        effort,
      },
    ])
    setDraft('')
    setAttachedFiles([])
  }

  const sendQueuedMessage = async (message: QueuedConversationMessage) => {
    if (queueSendingRef.current) return
    queueSendingRef.current = true
    try {
      await sendFollowUp(message)
    } finally {
      queueSendingRef.current = false
    }
  }

  const removeQueuedMessage = (messageId: string) => {
    setQueuedMessages((current) => current.filter((item) => item.id !== messageId))
  }

  const addAttachedFile = (file: ConversationAttachment) => {
    setAttachedFiles((current) => (current.some((item) => item.id === file.id) ? current : [...current, file]))
  }

  const removeAttachedFile = (fileId: number) => {
    setAttachedFiles((current) => current.filter((file) => file.id !== fileId))
  }

  const handleDeleteConversation = async (conversation: SandboxRecord) => {
    if (!window.confirm(`删除对话「${conversation.title || `#${conversation.id}`}」？`)) return
    setError('')
    try {
      await deleteTask(conversation.id)
      removeManualSuggestionsForTask(conversation.id)
      if (selectedConversationId === conversation.id || selectedThreadId === conversation.id) {
        setSelectedConversationId(null)
        setSelectedThreadId(null)
        setDisplayedTaskState(null)
      }
      window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
      await loadSandboxes()
    } catch (err) {
      console.error('Failed to delete conversation', err)
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail === 'Running task cannot be deleted' ? '运行中的对话不能删除，请先等待完成。' : detail || '删除对话失败')
    }
  }

  const cancelDisplayedTask = async () => {
    if (!displayedTaskId || cancelling) return
    setCancelling(true)
    setError('')
    try {
      await cancelTask(displayedTaskId)
      const taskRes = await getTask(displayedTaskId)
      setDisplayedTaskState(taskRes.data)
      updateTaskStatusInList(displayedTaskId, taskRes.data.status)
    } catch (err) {
      console.error('Failed to cancel task', err)
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      if (detail === 'Task is already terminal') {
        const taskRes = await getTask(displayedTaskId)
        setDisplayedTaskState(taskRes.data)
        updateTaskStatusInList(displayedTaskId, taskRes.data.status)
      } else {
        setError(detail || '取消任务失败')
      }
    } finally {
      setCancelling(false)
    }
  }

  const updateTaskStatusInList = (taskId: number, status: AgentTask['status']) => {
    setSandboxes((current) => current.map((item) => (item.id === taskId ? { ...item, status } : item)))
  }

  const startNewConversationDraft = () => {
    if (!selectedSandbox) return
    if (creatingConversation) return
    setCreatingConversation(true)
    setSelectedConversationId(null)
    setSelectedThreadId(null)
    setDisplayedTaskState(null)
    setDraft('')
  }

  const closeNewConversationDraft = () => {
    setCreatingConversation(false)
    setDraft('')
  }

  const conversationRail = (
    <div className="shrink-0 border-b border-slate-200 bg-white/85">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={startNewConversationDraft}
          disabled={!selectedSandbox}
          className={[
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition',
            creatingConversation
              ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
              : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        >
          <Icon name="send" className="h-3.5 w-3.5" />
          新增对话
        </button>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500" title="对话数量">
          {visibleConversationCount}
        </span>
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={() => void loadSandboxes()}
          disabled={loading}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-wait disabled:opacity-60"
          title="刷新对话"
        >
          <Icon name="reload" className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
        </button>
        <button
          type="button"
          onClick={() => setConversationRailCollapsed((current) => !current)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
          title={conversationRailCollapsed ? '展开对话列表' : '折叠对话列表'}
        >
          <Icon name={conversationRailCollapsed ? 'chevronDown' : 'chevronRight'} className="h-4 w-4" />
        </button>
      </div>

      {!conversationRailCollapsed ? (
        <div className="border-t border-slate-100 px-3 pb-2">
          {error ? (
            <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          ) : null}
          {loading ? (
            <span className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-xs text-slate-500">正在加载...</span>
          ) : conversationItems.length || creatingConversation ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {creatingConversation ? (
                <button
                  type="button"
                  onClick={() => {
                    setCreatingConversation(true)
                    setSelectedConversationId(null)
                    setSelectedThreadId(null)
                  }}
                  className="w-44 shrink-0 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-left text-cyan-900 transition"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold">新建对话</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation()
                        closeNewConversationDraft()
                      }}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-cyan-700 transition hover:bg-white"
                      title="取消新建对话"
                    >
                      ×
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-cyan-700/70">{draft.trim() || '等待输入内容'}</p>
                </button>
              ) : null}
              {conversationItems.map((sandbox) => (
                <button
                  key={sandbox.id}
                  type="button"
                  onContextMenu={(event) => {
                    event.preventDefault()
                    void handleDeleteConversation(sandbox)
                  }}
                  onClick={() => {
                    setCreatingConversation(false)
                    setDraft('')
                    setSelectedThreadId(sandbox.id)
                    setSelectedConversationId(getLatestThreadTaskId(sandboxes, sandbox.id))
                  }}
                  className={[
                    'w-44 shrink-0 rounded-xl border px-3 py-2 text-left transition',
                    selectedThreadId === sandbox.id && !creatingConversation
                      ? 'border-cyan-200 bg-cyan-50 text-cyan-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold">{sandbox.title || `对话 #${sandbox.id}`}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{sandbox.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-400">{sandbox.lastMessage}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f3f6fb]">
      <div
        ref={conversationGridRef}
        className={[
          'flex min-h-0 flex-1 flex-col overflow-hidden',
        ].join(' ')}
      >
        {conversationRail}
        {creatingConversation ? (
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1" />
            <ConversationInput
              draft={draft}
              setDraft={setDraft}
              attachedFiles={attachedFiles}
              onAttachFile={addAttachedFile}
              onRemoveAttachedFile={removeAttachedFile}
              submitting={submitting}
              onSubmit={sendFollowUp}
              onQueue={queueCurrentDraft}
              queuedMessages={queuedMessages}
              onRemoveQueuedMessage={removeQueuedMessage}
              placeholder="输入新对话内容..."
              mode={conversationMode}
              setMode={setConversationMode}
              agentType={agentType}
              setAgentType={setAgentType}
              model={model}
              setModel={setModel}
              effort={effort}
              setEffort={setEffort}
              running={displayedTaskRunning}
              cancelling={cancelling}
              onCancel={cancelDisplayedTask}
            />
          </div>
        ) : displayedTaskId ? (
          <div className="flex min-h-0 flex-col">
            <div ref={conversationScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <div className="space-y-4">
                {(displayedThreadTasks.length ? displayedThreadTasks : [{ id: displayedTaskId } as SandboxRecord]).map((threadTask) => (
                  <div
                    key={threadTask.id}
                    ref={threadTask.id === targetConversationId ? targetConversationRef : undefined}
                    className={[
                      'rounded-[22px] transition',
                      threadTask.id === targetConversationId ? 'ring-2 ring-cyan-300 ring-offset-4 ring-offset-[#f5f7fb]' : '',
                    ].join(' ')}
                  >
                    <AgentTaskConversation
                      taskId={threadTask.id}
                      embedded
                      onTaskChange={threadTask.id === displayedTaskId ? setDisplayedTaskState : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
            <ConversationInput
              draft={draft}
              setDraft={setDraft}
              attachedFiles={attachedFiles}
              onAttachFile={addAttachedFile}
              onRemoveAttachedFile={removeAttachedFile}
              submitting={submitting}
              onSubmit={sendFollowUp}
              onQueue={queueCurrentDraft}
              queuedMessages={queuedMessages}
              onRemoveQueuedMessage={removeQueuedMessage}
              placeholder="继续输入当前对话..."
              mode={conversationMode}
              setMode={setConversationMode}
              agentType={agentType}
              setAgentType={setAgentType}
              model={model}
              setModel={setModel}
              effort={effort}
              setEffort={setEffort}
              running={displayedTaskRunning}
              cancelling={cancelling}
              onCancel={cancelDisplayedTask}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1" />
            <ConversationInput
              draft={draft}
              setDraft={setDraft}
              attachedFiles={attachedFiles}
              onAttachFile={addAttachedFile}
              onRemoveAttachedFile={removeAttachedFile}
              submitting={submitting}
              onSubmit={sendFollowUp}
              onQueue={queueCurrentDraft}
              queuedMessages={queuedMessages}
              onRemoveQueuedMessage={removeQueuedMessage}
              placeholder="输入第一条对话..."
              mode={conversationMode}
              setMode={setConversationMode}
              agentType={agentType}
              setAgentType={setAgentType}
              model={model}
              setModel={setModel}
              effort={effort}
              setEffort={setEffort}
              running={false}
              cancelling={cancelling}
              onCancel={cancelDisplayedTask}
            />
          </div>
        )}

      </div>
    </div>
  )
}

function ConversationInput({
  draft,
  setDraft,
  attachedFiles,
  onAttachFile,
  onRemoveAttachedFile,
  submitting,
  onSubmit,
  onQueue,
  queuedMessages,
  onRemoveQueuedMessage,
  placeholder,
  mode,
  setMode,
  agentType,
  setAgentType,
  model,
  setModel,
  effort,
  setEffort,
  running,
  cancelling,
  onCancel,
}: {
  draft: string
  setDraft: (value: string) => void
  attachedFiles: ConversationAttachment[]
  onAttachFile: (file: ConversationAttachment) => void
  onRemoveAttachedFile: (fileId: number) => void
  submitting: boolean
  onSubmit: () => void
  onQueue: () => void
  queuedMessages: QueuedConversationMessage[]
  onRemoveQueuedMessage: (messageId: string) => void
  placeholder: string
  mode: ConversationMode
  setMode: (value: ConversationMode) => void
  agentType: string
  setAgentType: (value: string) => void
  model: string
  setModel: (value: string) => void
  effort: string
  setEffort: (value: string) => void
  running: boolean
  cancelling: boolean
  onCancel: () => void
}) {
  const hasPendingInput = Boolean(draft.trim() || attachedFiles.length)
  const shouldQueue = running && hasPendingInput
  const [inputHeight, setInputHeight] = useState(() => readStoredInputHeight())
  const [resizing, setResizing] = useState(false)
  const [fileDragOver, setFileDragOver] = useState(false)
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(CONVERSATION_INPUT_HEIGHT_KEY, String(inputHeight))
    } catch {
      // localStorage may be unavailable in constrained shells.
    }
  }, [inputHeight])

  useEffect(() => {
    if (!resizing) return
    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current
      if (!resizeState) return
      const nextHeight = resizeState.startHeight + resizeState.startY - event.clientY
      setInputHeight(clampInputHeight(nextHeight))
    }
    const stopResize = () => {
      resizeStateRef.current = null
      setResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize, { once: true })
    window.addEventListener('pointercancel', stopResize, { once: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing])

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeStateRef.current = { startY: event.clientY, startHeight: inputHeight }
    setResizing(true)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  const handleFileDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!isSandboxFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setFileDragOver(true)
  }

  const handleFileDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFileDragOver(false)
    }
  }

  const handleFileDrop = (event: React.DragEvent<HTMLElement>) => {
    if (!isSandboxFileDrag(event)) return
    event.preventDefault()
    setFileDragOver(false)
    const file = parseSandboxFileDrag(event)
    if (file) onAttachFile(file)
  }

  return (
    <div className="border-t border-slate-200 bg-white/95 p-2">
      <Panel
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={[
          'relative rounded-xl border-slate-200/90 p-2.5 shadow-sm transition',
          fileDragOver ? 'border-cyan-300 bg-cyan-50/60 ring-2 ring-cyan-100' : '',
        ].join(' ')}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          onPointerDown={startResize}
          className={[
            '-mt-1 mb-1.5 flex h-3 cursor-ns-resize items-center justify-center rounded-lg transition',
            resizing ? 'bg-cyan-50 text-cyan-600' : 'text-slate-300 hover:bg-slate-50 hover:text-cyan-500',
          ].join(' ')}
          title="上下拖动调整对话栏高度"
        >
          <span className="h-0.5 w-8 rounded-full bg-current" />
        </div>
        {queuedMessages.length ? (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Icon name="queueSend" className="h-3.5 w-3.5 text-cyan-600" />
                <span>{queuedMessages.length} 条待发送</span>
              </div>
              <span className="text-[11px] text-slate-400">当前任务结束后自动发送</span>
            </div>
            <div className="max-h-24 overflow-y-auto p-2">
              {queuedMessages.map((message) => (
                <div key={message.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600">
                  <span className="min-w-0 flex-1 truncate">
                    {message.rawPrompt}
                    {message.attachedFiles.length ? ` · ${message.attachedFiles.length} 个附件` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveQueuedMessage(message.id)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                    title="删除待发送"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-none border-none bg-transparent text-[13px] leading-5 text-slate-800 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          style={{ height: inputHeight }}
        />
        {attachedFiles.length ? (
          <div className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto border-t border-slate-100 pt-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] text-cyan-700 ring-1 ring-cyan-200"
              >
                <Icon name="file" className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[220px] truncate">{file.filename}</span>
                <span className="shrink-0 text-cyan-500">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachedFile(file.id)}
                  className="rounded-full text-cyan-400 transition hover:text-cyan-800"
                  title="移除附件"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {fileDragOver ? (
          <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-xl border border-dashed border-cyan-300 bg-white/80 text-sm font-semibold text-cyan-700 backdrop-blur-sm">
            松开后把文件作为本轮输入
          </div>
        ) : null}
        <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarSelect value={mode} onChange={(value) => setMode(value as ConversationMode)} options={MODE_OPTIONS} />
            <ToolbarSelect value={model} onChange={setModel} options={MODEL_OPTIONS} />
            <ToolbarSelect value={effort} onChange={setEffort} options={EFFORT_OPTIONS} />
            <ToolbarSelect value={agentType} onChange={setAgentType} options={AGENT_OPTIONS} disabled={mode === 'ask'} />
          </div>
          <div className="flex items-center justify-end gap-3">
            {shouldQueue ? (
              <button
                type="button"
                onClick={onQueue}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                title="加入待发送队列"
              >
                <Icon name="queueSend" className="h-3.5 w-3.5 text-indigo-600" />
                排队
              </button>
            ) : running ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-500 px-3 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                title="取消运行"
              >
                <span className="h-3 w-3 rounded-[3px] bg-white" />
                {cancelling ? '取消中' : '停止'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!hasPendingInput || submitting}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Icon name="send" className="h-3.5 w-3.5" />
                {submitting ? '发送中' : mode === 'ask' ? '提问' : '运行'}
              </button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}

function readStoredInputHeight() {
  try {
    const raw = localStorage.getItem(CONVERSATION_INPUT_HEIGHT_KEY)
    const parsed = raw ? Number(raw) : DEFAULT_CONVERSATION_INPUT_HEIGHT
    return clampInputHeight(Number.isFinite(parsed) ? parsed : DEFAULT_CONVERSATION_INPUT_HEIGHT)
  } catch {
    return DEFAULT_CONVERSATION_INPUT_HEIGHT
  }
}

function clampInputHeight(value: number) {
  return Math.min(Math.max(Math.round(value), MIN_CONVERSATION_INPUT_HEIGHT), MAX_CONVERSATION_INPUT_HEIGHT)
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function readStoredConversationRailWidth() {
  try {
    const raw = localStorage.getItem(CONVERSATION_RAIL_WIDTH_KEY)
    const parsed = raw ? Number(raw) : DEFAULT_CONVERSATION_RAIL_WIDTH
    return clampConversationRailWidth(Number.isFinite(parsed) ? parsed : DEFAULT_CONVERSATION_RAIL_WIDTH)
  } catch {
    return DEFAULT_CONVERSATION_RAIL_WIDTH
  }
}

function clampConversationRailWidth(value: number) {
  return Math.min(Math.max(Math.round(value), MIN_CONVERSATION_RAIL_WIDTH), MAX_CONVERSATION_RAIL_WIDTH)
}

function ToolbarSelect({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className={['relative inline-flex h-7 items-center', disabled ? 'opacity-45' : ''].join(' ')}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-7 appearance-none rounded-md border border-transparent bg-white py-0 pl-2.5 pr-6 text-[11px] font-medium text-slate-600 outline-none transition hover:bg-slate-50 focus:border-cyan-200 focus:ring-4 focus:ring-cyan-50 disabled:cursor-not-allowed"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400" />
    </label>
  )
}

function pickLastMessage(events: AgentTaskEvent[]) {
  return [...events]
    .reverse()
    .find((event) => event.content?.trim() && !['task_created', 'task_status_changed'].includes(event.type))
    ?.content.trim()
}

function buildFollowUpPrompt(sandbox: SandboxRecord | null, prompt: string) {
  if (!sandbox) return prompt
  return [`继续沙盒 #${sandbox.id}`, `原始目标：${sandbox.prompt}`, `本轮输入：${prompt}`].join('\n')
}

function appendAttachedFilesToPrompt(prompt: string, files: ConversationAttachment[]) {
  if (!files.length) return prompt
  return [
    prompt,
    '',
    '本轮已附加沙盒文件，文件会出现在当前运行工作目录的 input/ 下：',
    ...files.map((file) => `- input/${file.filename}`),
  ].join('\n')
}

function isSandboxFileDrag(event: React.DragEvent<HTMLElement>) {
  return hasSandboxFileDragData(event.dataTransfer) || Boolean(getActiveSandboxFileDrag())
}

function parseSandboxFileDrag(event: React.DragEvent<HTMLElement>): ConversationAttachment | null {
  return readSandboxFileDragData(event.dataTransfer) || getActiveSandboxFileDrag()
}

function getParentTaskId(sandbox: SandboxRecord) {
  const value = sandbox.input?.parent_task_id
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getThreadId(sandbox: SandboxRecord) {
  const value = sandbox.input?.thread_id
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getLatestThreadTaskId(records: SandboxRecord[], threadId: number) {
  const tasks = records.filter((item) => item.id === threadId || getThreadId(item) === threadId)
  const latest = tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  return latest?.id ?? threadId
}

function isLiveTaskStatus(status: string) {
  return ['pending', 'queued', 'running', 'waiting_approval', 'cancelling'].includes(status)
}
