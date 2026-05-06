import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cancelTask, createTask, startTask, uploadTaskFile } from '../api/tasks'
import AgentTaskConversation from '../components/AgentTaskConversation'
import { Icon, LogoMark, Panel } from '../components/WensaiUI'
import { TASK_CATEGORIES } from '../data/wensai'
import type { AgentTask } from '../types'

const FILE_ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.tex,.csv,.json,.xlsx,.xls,.png,.jpg,.jpeg'
const DEFAULT_PROMPT = '请读取沙盒中的材料，分析内容并生成一份执行状态报告。'
const MODEL_OPTIONS = [
  { value: 'deepseek-v4', label: 'DeepSeek V4' },
  { value: 'gpt-5.5', label: 'GPT 5.5' },
  { value: 'gpt-5.4', label: 'GPT 5.4' },
  { value: 'default', label: 'Default' },
]

interface SandboxFile {
  file: File
  relativePath: string
}

interface WorkspaceReferenceFile {
  id: number
  filename: string
}

interface ConversationRun {
  id: string
  prompt: string
  taskId: number
}

interface QueuedMessage {
  id: string
  prompt: string
  categories: string[]
  sandboxFiles: SandboxFile[]
  workspaceReferenceFiles: WorkspaceReferenceFile[]
  agentType: string
  model: string
}

interface TaskCreatePageProps {
  onSandboxCreated?: (taskId: number) => void
}

export default function TaskCreatePage({ onSandboxCreated }: TaskCreatePageProps = {}) {
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const timelineShellRef = useRef<HTMLDivElement | null>(null)
  const queueSendingRef = useRef(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [agentType, setAgentType] = useState('hermes_acp')
  const [model, setModel] = useState('deepseek-v4')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sandboxFiles, setSandboxFiles] = useState<SandboxFile[]>([])
  const [workspaceReferenceFiles, setWorkspaceReferenceFiles] = useState<WorkspaceReferenceFile[]>([])
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [queueExpanded, setQueueExpanded] = useState(true)
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null)
  const [editingQueueText, setEditingQueueText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [runs, setRuns] = useState<ConversationRun[]>([])
  const [taskStates, setTaskStates] = useState<Record<number, AgentTask | null>>({})

  const totalSize = useMemo(
    () => sandboxFiles.reduce((sum, item) => sum + item.file.size, 0),
    [sandboxFiles],
  )

  useEffect(() => {
    const presetCategory = searchParams.get('category')
    const presetPrompt = searchParams.get('prompt')
    const workspaceFileId = searchParams.get('workspaceFileId')
    const workspaceFileName = searchParams.get('workspaceFileName')

    if (presetCategory && TASK_CATEGORIES.includes(presetCategory)) {
      setSelectedCategories((current) => (current.includes(presetCategory) ? current : [...current, presetCategory]))
      setPrompt((current) =>
        presetPrompt
          ? presetPrompt
          : current === DEFAULT_PROMPT
            ? `请围绕「${presetCategory}」处理沙盒材料，并输出可执行结论。`
            : current,
      )
    } else if (presetPrompt) {
      setPrompt(presetPrompt)
    }

    if (workspaceFileId && workspaceFileName) {
      const id = Number(workspaceFileId)
      if (Number.isFinite(id)) {
        setWorkspaceReferenceFiles([{ id, filename: workspaceFileName }])
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!runs.length) return
    timelineShellRef.current?.scrollTo({ top: timelineShellRef.current.scrollHeight, behavior: 'smooth' })
  }, [runs.length])

  const activeRun = runs.at(-1) || null
  const activeTask = activeRun ? taskStates[activeRun.taskId] || null : null
  const activeTaskRunning =
    submitting || Boolean(activeRun && !activeTask) || ['queued', 'running', 'waiting_approval'].includes(activeTask?.status || '')
  const composerHasPrompt = Boolean(prompt.trim())
  const shouldQueueCurrentPrompt = activeTaskRunning && composerHasPrompt

  useEffect(() => {
    if (submitting || activeTaskRunning || queueSendingRef.current || !queuedMessages.length) return
    const [nextMessage] = queuedMessages
    setQueuedMessages((current) => current.slice(1))
    void sendQueuedMessage(nextMessage)
  }, [activeTaskRunning, submitting, queuedMessages.length])

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const next = [...sandboxFiles]
    const known = new Set(next.map((item) => `${item.relativePath}:${item.file.size}`))
    Array.from(files).forEach((file) => {
      const relativePath = getRelativePath(file)
      const key = `${relativePath}:${file.size}`
      if (!known.has(key)) {
        next.push({ file, relativePath })
        known.add(key)
      }
    })
    setSandboxFiles(next)
  }

  const removeFile = (relativePath: string) => {
    setSandboxFiles((current) => current.filter((item) => item.relativePath !== relativePath))
  }

  const removeWorkspaceReferenceFile = (id: number) => {
    setWorkspaceReferenceFiles((current) => current.filter((item) => item.id !== id))
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  const buildCurrentQueuedMessage = (): QueuedMessage => ({
    id: `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    prompt: prompt.trim(),
    categories: selectedCategories,
    sandboxFiles,
    workspaceReferenceFiles,
    agentType,
    model,
  })

  const createAndStartRun = async (message: QueuedMessage) => {
    setSubmitting(true)
    setError('')
    setProgress('正在创建沙盒任务')
    try {
      const finalPrompt = buildTaskPrompt(message.prompt, message.categories)
      const res = await createTask({
        agent_type: message.agentType,
        model: message.model,
        prompt: finalPrompt,
        dispatch: false,
        input: {
          workspace_file_ids: message.workspaceReferenceFiles.map((item) => item.id),
          sandbox_files: message.sandboxFiles.map((item) => ({
            filename: item.file.name,
            relative_path: item.relativePath,
            size: item.file.size,
            mime_type: item.file.type || null,
          })),
        },
      })
      const taskId = res.data.task_id
      onSandboxCreated?.(taskId)
      window.dispatchEvent(new CustomEvent('wensai:sandboxes-changed'))
      for (let index = 0; index < message.sandboxFiles.length; index += 1) {
        const item = message.sandboxFiles[index]
        setProgress(`正在传输沙盒文件 ${index + 1} / ${message.sandboxFiles.length}`)
        await uploadTaskFile(taskId, item.file, item.relativePath)
        window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      }
      setProgress('正在启动 AgentSDK 沙盒')
      await startTask(taskId)
      setRuns((current) => [
        ...current,
        {
          id: `run-${taskId}-${Date.now()}`,
          prompt: message.prompt,
          taskId,
        },
      ])
      setProgress('')
    } catch (err) {
      console.error('Failed to create sandbox task', err)
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '创建沙盒任务失败')
      setProgress('')
    } finally {
      setSubmitting(false)
    }
  }

  const submit = async () => {
    if (!prompt.trim()) return
    if (shouldQueueCurrentPrompt) {
      enqueueCurrentPrompt()
      return
    }
    if (submitting) return
    const message = buildCurrentQueuedMessage()
    await createAndStartRun(message)
    setPrompt('')
    setWorkspaceReferenceFiles([])
  }

  const enqueueCurrentPrompt = () => {
    if (!prompt.trim()) return
    setQueuedMessages((current) => [...current, buildCurrentQueuedMessage()])
    setQueueExpanded(true)
    setPrompt('')
    setWorkspaceReferenceFiles([])
  }

  const sendQueuedMessage = async (message: QueuedMessage) => {
    if (queueSendingRef.current) return
    queueSendingRef.current = true
    try {
      await createAndStartRun(message)
    } finally {
      queueSendingRef.current = false
    }
  }

  const sendQueuedNow = (message: QueuedMessage) => {
    setQueuedMessages((current) => current.filter((item) => item.id !== message.id))
    void sendQueuedMessage(message)
  }

  const startEditingQueuedMessage = (message: QueuedMessage) => {
    setEditingQueueId(message.id)
    setEditingQueueText(message.prompt)
  }

  const saveEditingQueuedMessage = () => {
    if (!editingQueueId) return
    const nextText = editingQueueText.trim()
    if (!nextText) return
    setQueuedMessages((current) =>
      current.map((item) => (item.id === editingQueueId ? { ...item, prompt: nextText } : item)),
    )
    setEditingQueueId(null)
    setEditingQueueText('')
  }

  const removeQueuedMessage = (messageId: string) => {
    setQueuedMessages((current) => current.filter((item) => item.id !== messageId))
    if (editingQueueId === messageId) {
      setEditingQueueId(null)
      setEditingQueueText('')
    }
  }

  const stopActiveTask = async () => {
    if (!activeRun || !activeTaskRunning) return
    setError('')
    setProgress('正在停止当前任务')
    try {
      await cancelTask(activeRun.taskId)
    } catch (err) {
      console.error('Failed to stop task', err)
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '停止任务失败')
    } finally {
      setProgress('')
    }
  }

  return (
    <div className="min-h-full bg-white">
      <section className="flex min-h-[calc(100vh-40px)] flex-col px-4 pb-6 pt-8 md:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark className="h-12 w-12" />
                <div>
                  <h1 className="text-2xl font-semibold text-slate-950">沙盒</h1>
                  <p className="mt-1 text-sm text-slate-500">上传材料并让 AgentSDK 在独立沙盒中处理。</p>
                </div>
              </div>
            </div>
            <label className="block min-w-[190px]">
              <span className="mb-2 block text-xs font-semibold text-slate-500">Runtime</span>
              <select
                value={agentType}
                onChange={(event) => setAgentType(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="hermes_acp">Hermes ACP</option>
              </select>
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_ACCEPT}
            className="hidden"
            onChange={(event) => addFiles(event.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => addFiles(event.target.files)}
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#f7f8fa] shadow-sm">
            <div
              ref={timelineShellRef}
              className="h-[calc(100vh-300px)] min-h-[460px] overflow-y-auto px-4 py-4 md:px-5 md:py-5"
            >
              {runs.length ? (
                <div className="mx-auto max-w-3xl space-y-4">
                  {runs.map((run) => (
                    <div key={run.id} className="space-y-3">
                      <div className="ml-auto max-w-[85%] rounded-2xl bg-slate-950 px-4 py-3 text-[13px] leading-6 text-white shadow-sm">
                        {run.prompt}
                      </div>
                      <AgentTaskConversation
                        taskId={run.taskId}
                        embedded
                        onTaskChange={(task) => {
                          setTaskStates((current) => ({ ...current, [run.taskId]: task }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-4 py-8">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Agent Workspace</p>
                    <h2 className="mt-3 text-xl font-semibold text-slate-950">在这里直接运行沙盒任务</h2>
                    <p className="mt-2 text-[13px] leading-6 text-slate-500">
                      发送后，运行状态、工具动作、输出文件和结果都会在这个大框里持续滚动更新，不再跳到单独页面。
                    </p>
                  </div>
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">当前附件</p>
                    <p className="mt-2 text-[13px] leading-6 text-slate-500">
                      {sandboxFiles.length || workspaceReferenceFiles.length
                        ? [
                            sandboxFiles.length ? `${sandboxFiles.length} 个上传文件，合计 ${formatFileSize(totalSize)}` : null,
                            workspaceReferenceFiles.length ? `${workspaceReferenceFiles.length} 个工作空间引用文件` : null,
                          ].filter(Boolean).join('；')
                        : '还没有附加文件。你可以在下方输入框右侧继续上传文件或文件夹。'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white/95 p-4 backdrop-blur md:p-5">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {TASK_CATEGORIES.map((item) => {
                        const active = selectedCategories.includes(item)
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleCategory(item)}
                            className={[
                              'inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition',
                              active
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700',
                            ].join(' ')}
                          >
                            {item}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-8 items-center gap-2 rounded-full border border-dashed border-cyan-300 bg-cyan-50/70 px-3 text-xs font-medium text-cyan-700 transition hover:bg-cyan-50"
                      >
                        <Icon name="upload" className="h-3.5 w-3.5" />
                        上传文件
                      </button>
                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        className="inline-flex h-8 items-center gap-2 rounded-full border border-dashed border-cyan-300 bg-cyan-50/70 px-3 text-xs font-medium text-cyan-700 transition hover:bg-cyan-50"
                      >
                        <Icon name="file" className="h-3.5 w-3.5" />
                        上传文件夹
                      </button>
                    </div>
                  </div>

                  {selectedCategories.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCategories.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-semibold text-cyan-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {queuedMessages.length ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex h-10 items-center justify-between border-b border-slate-200 px-3">
                        <button
                          type="button"
                          onClick={() => setQueueExpanded((current) => !current)}
                          className="inline-flex min-w-0 items-center gap-2 text-left text-xs font-medium text-slate-600"
                        >
                          <Icon
                            name="chevronDown"
                            className={[
                              'h-3.5 w-3.5 shrink-0 transition-transform',
                              queueExpanded ? 'rotate-0' : '-rotate-90',
                            ].join(' ')}
                          />
                          <span>{queuedMessages.length} Queued Message{queuedMessages.length > 1 ? 's' : ''}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQueuedMessages([])
                            setEditingQueueId(null)
                            setEditingQueueText('')
                          }}
                          className="text-xs font-medium text-slate-500 transition hover:text-slate-950"
                        >
                          Clear All
                        </button>
                      </div>
                      {queueExpanded ? (
                        <div className="divide-y divide-slate-200">
                          {queuedMessages.map((message) => {
                            const editing = editingQueueId === message.id
                            return (
                              <div key={message.id} className="flex items-start gap-3 px-3 py-2">
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                                <div className="min-w-0 flex-1">
                                  {editing ? (
                                    <textarea
                                      value={editingQueueText}
                                      onChange={(event) => setEditingQueueText(event.target.value)}
                                      className="h-16 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                                      autoFocus
                                    />
                                  ) : (
                                    <>
                                      <p className="line-clamp-2 break-words text-xs leading-5 text-slate-800">
                                        {message.prompt}
                                      </p>
                                      {message.sandboxFiles.length || message.workspaceReferenceFiles.length ? (
                                        <p className="mt-1 text-[11px] text-slate-400">
                                          {[
                                            message.sandboxFiles.length ? `${message.sandboxFiles.length} 个上传文件` : null,
                                            message.workspaceReferenceFiles.length
                                              ? `${message.workspaceReferenceFiles.length} 个工作空间文件`
                                              : null,
                                          ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                        </p>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  {editing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingQueueId(null)
                                          setEditingQueueText('')
                                        }}
                                        className="h-8 rounded-md px-2 text-xs text-slate-500 transition hover:bg-white hover:text-slate-900"
                                      >
                                        取消
                                      </button>
                                      <button
                                        type="button"
                                        onClick={saveEditingQueuedMessage}
                                        disabled={!editingQueueText.trim()}
                                        className="h-8 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                      >
                                        保存
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => removeQueuedMessage(message.id)}
                                        className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-white hover:text-rose-600"
                                        title="删除"
                                      >
                                        <Icon name="trash" className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => startEditingQueuedMessage(message)}
                                        className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950"
                                        title="编辑"
                                      >
                                        <Icon name="edit" className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => sendQueuedNow(message)}
                                        disabled={submitting}
                                        className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                      >
                                        Send Now
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="mt-3 h-28 w-full resize-none border-none bg-transparent px-0 py-0 text-[13px] leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
                    placeholder={DEFAULT_PROMPT}
                  />

                  {sandboxFiles.length || workspaceReferenceFiles.length ? (
                    <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto border-t border-slate-200 pt-3">
                      {workspaceReferenceFiles.map((item) => (
                        <div
                          key={`workspace-${item.id}`}
                          className="inline-flex max-w-full items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] text-cyan-700 ring-1 ring-cyan-200"
                        >
                          <span className="truncate">{item.filename}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-cyan-700">工作空间</span>
                          <button
                            type="button"
                            onClick={() => removeWorkspaceReferenceFile(item.id)}
                            className="rounded-full text-cyan-400 transition hover:text-cyan-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {sandboxFiles.map((item) => (
                        <div
                          key={`${item.relativePath}:${item.file.size}`}
                          className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200"
                        >
                          <span className="truncate">{item.relativePath}</span>
                          <span className="text-slate-400">{formatFileSize(item.file.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(item.relativePath)}
                            className="rounded-full text-slate-400 transition hover:text-slate-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {error && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      {error}
                    </div>
                  )}
                  {progress && (
                    <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-700">
                      {progress}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">模型</label>
                      <select
                        value={model}
                        onChange={(event) => setModel(event.target.value)}
                        className="h-9 min-w-[170px] rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                      >
                        {MODEL_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={shouldQueueCurrentPrompt ? enqueueCurrentPrompt : activeTaskRunning ? stopActiveTask : submit}
                      disabled={shouldQueueCurrentPrompt ? false : activeTaskRunning ? false : submitting || !prompt.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {shouldQueueCurrentPrompt ? (
                        <>
                          <Icon name="send" className="h-3.5 w-3.5" />
                          加入队列
                        </>
                      ) : activeTaskRunning ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
                          停止
                        </>
                      ) : (
                        <>
                          {submitting ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
                          ) : (
                            <Icon name="send" className="h-3.5 w-3.5" />
                          )}
                          {runs.length ? '追加发送' : '发送'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function buildTaskPrompt(prompt: string, categories: string[]): string {
  const basePrompt = prompt.trim()
  if (!categories.length) return basePrompt
  return `任务方向：${categories.join('、')}\n${basePrompt}`
}

function getRelativePath(file: File): string {
  const withDirectory = file as File & { webkitRelativePath?: string }
  return withDirectory.webkitRelativePath || file.name
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
