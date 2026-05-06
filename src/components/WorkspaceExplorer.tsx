import { useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { createTaskFile, deleteTaskFile, getTaskFiles, uploadTaskFile } from '../api/tasks'
import { downloadFileBlob } from '../api/files'
import { listWorkspaceTasks } from '../api/workspaces'
import { isNativeShell } from '../platform'
import type { AgentFile, WorkspaceTaskSummary } from '../types'
import { isLayoutPreviewFile } from '../utils/localDocumentPreview'
import { clearActiveSandboxFileDrag, setActiveSandboxFileDrag, writeSandboxFileDragData } from '../utils/sandboxFileDrag'
import { Icon } from './WensaiUI'

const FILE_ORDER_STORAGE_PREFIX = 'wensai.sandbox-file-order.'
const FOLDER_MARKER_NAME = '.wensai-folder'
const RESULT_TEXT_DRAG_TYPE = 'application/x-wensai-result-text'

interface WorkspaceExplorerProps {
  collapsed: boolean
  workspaceId: number | null | undefined
  sandboxId: number | null | undefined
  sandboxName: string
  onSelectSandbox: (taskId: number | null, sandbox?: WorkspaceTaskSummary | null) => void
  onOpenSandboxManage: () => void
  selectedFileId: number | null
  onSelectFile: (fileId: number, file?: AgentFile | null) => void
}

interface FileTreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  children?: FileTreeNode[]
  file?: AgentFile
}

interface NativeDroppedFile {
  filename: string
  path: string
  bytes: number[]
}

export default function WorkspaceExplorer({
  collapsed,
  workspaceId,
  sandboxId,
  sandboxName,
  onSelectSandbox,
  onOpenSandboxManage,
  selectedFileId,
  onSelectFile,
}: WorkspaceExplorerProps) {
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<AgentFile[]>([])
  const [sandboxOptions, setSandboxOptions] = useState<WorkspaceTaskSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSandboxes, setLoadingSandboxes] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number; filename: string } | null>(null)
  const [sandboxMenuOpen, setSandboxMenuOpen] = useState(false)
  const [error, setError] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [fileOrder, setFileOrder] = useState<number[]>([])
  const [draggedFileId, setDraggedFileId] = useState<number | null>(null)
  const [localFileDragOver, setLocalFileDragOver] = useState(false)
  const [resultTextDragOver, setResultTextDragOver] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; file: AgentFile } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!sandboxId) {
      setFileOrder([])
      return
    }
    setFileOrder(readStoredFileOrder(sandboxId))
  }, [sandboxId])

  useEffect(() => {
    if (!sandboxId) return
    localStorage.setItem(`${FILE_ORDER_STORAGE_PREFIX}${sandboxId}`, JSON.stringify(fileOrder))
  }, [fileOrder, sandboxId])

  const loadFiles = async () => {
    if (!sandboxId) {
      setFiles([])
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await getTaskFiles(sandboxId)
      setFiles(res.data)
    } catch (err) {
      console.error('Failed to load sandbox files', err)
      setError('加载沙盒文件失败')
    } finally {
      setLoading(false)
    }
  }

  const loadSandboxes = async () => {
    if (!workspaceId) {
      setSandboxOptions([])
      return
    }
    setLoadingSandboxes(true)
    try {
      const res = await listWorkspaceTasks(workspaceId)
      const rootSandboxes = res.data.filter((sandbox) => getParentTaskId(sandbox) === null)
      setSandboxOptions(rootSandboxes)

      if (sandboxId && !rootSandboxes.some((sandbox) => sandbox.id === sandboxId)) {
        const selectedChild = res.data.find((sandbox) => sandbox.id === sandboxId)
        const parentId = selectedChild ? getParentTaskId(selectedChild) : null
        const parentSandbox = parentId ? rootSandboxes.find((sandbox) => sandbox.id === parentId) || null : null
        if (parentSandbox) {
          onSelectSandbox(parentSandbox.id, parentSandbox)
        }
      }
    } catch (err) {
      console.error('Failed to load sandbox options', err)
    } finally {
      setLoadingSandboxes(false)
    }
  }

  useEffect(() => {
    void loadFiles()
  }, [sandboxId])

  useEffect(() => {
    void loadSandboxes()
  }, [workspaceId])

  useEffect(() => {
    const handleRefresh = () => {
      void loadFiles()
    }
    const handleSandboxRefresh = () => {
      void loadSandboxes()
    }
    window.addEventListener('wensai:sandbox-files-changed', handleRefresh)
    window.addEventListener('wensai:workspace-files-changed', handleRefresh)
    window.addEventListener('wensai:sandboxes-changed', handleSandboxRefresh)
    return () => {
      window.removeEventListener('wensai:sandbox-files-changed', handleRefresh)
      window.removeEventListener('wensai:workspace-files-changed', handleRefresh)
      window.removeEventListener('wensai:sandboxes-changed', handleSandboxRefresh)
    }
  }, [sandboxId, workspaceId])

  useEffect(() => {
    if (!createMenuOpen && !fileContextMenu) return
    const close = () => {
      setCreateMenuOpen(false)
      setFileContextMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('keydown', close)
    }
  }, [createMenuOpen, fileContextMenu])

  const visibleFiles = useMemo(() => files.filter((file) => !isFolderMarker(file)), [files])
  const orderedFiles = useMemo(() => sortFilesByStoredOrder(visibleFiles, fileOrder), [visibleFiles, fileOrder])

  const filteredFiles = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return orderedFiles
    return orderedFiles.filter((file) => file.filename.toLowerCase().includes(keyword))
  }, [orderedFiles, query])

  const searchKeyword = query.trim()
  const searchResults = searchKeyword ? filteredFiles.slice(0, 8) : []
  const treeFiles = useMemo(
    () => (searchKeyword ? filteredFiles : sortFilesByStoredOrder(files, fileOrder)),
    [searchKeyword, filteredFiles, files, fileOrder],
  )
  const tree = useMemo(() => buildFileTree(treeFiles, fileOrder), [treeFiles, fileOrder])
  const selectedFile = visibleFiles.find((file) => file.id === selectedFileId) || null
  const selectedFileSupportsScreenshot = selectedFile ? supportsPreviewScreenshot(selectedFile) : false
  const activeSandbox = sandboxOptions.find((sandbox) => sandbox.id === sandboxId) || null

  const toggleFolder = (path: string) => {
    setExpandedFolders((current) => ({ ...current, [path]: !current[path] }))
  }

  const moveFile = (targetFileId: number) => {
    if (!draggedFileId || draggedFileId === targetFileId) return
    setFileOrder((current) =>
      reorderFileIds(current.length ? current : orderedFiles.map((file) => file.id), draggedFileId, targetFileId),
    )
  }

  const handleFileDragStart = (event: React.DragEvent<HTMLElement>, file: AgentFile) => {
    const payload = {
      id: file.id,
      task_id: file.task_id,
      filename: file.filename,
      mime_type: file.mime_type,
      size: file.size,
      source: file.source,
    }
    event.dataTransfer.effectAllowed = 'copyMove'
    writeSandboxFileDragData(event.dataTransfer, payload)
    setActiveSandboxFileDrag(payload)
    setDraggedFileId(file.id)
  }

  const selectFile = (file: AgentFile) => {
    onSelectFile(file.id, file)
    if (!isLayoutPreviewFile(file.filename, file.mime_type)) return
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('wensai:check-document-preview-cache', { detail: { fileId: file.id } }))
    }, 200)
  }

  const requestDocumentPreviewUpdate = (file: AgentFile) => {
    onSelectFile(file.id, file)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('wensai:update-document-preview', { detail: { fileId: file.id } }))
    }, 200)
  }

  const captureSelectedPreview = (file: AgentFile) => {
    if (!supportsPreviewScreenshot(file)) {
      setError('当前文件不是图片或可转图片预览的文档，不能区域截图。')
      return
    }
    setError('')
    if (file.id !== selectedFileId) {
      selectFile(file)
    }
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('wensai:start-preview-screenshot-selection', { detail: { fileId: file.id } }))
    }, 250)
  }

  const handleAddFiles = async (fileList: FileList | null) => {
    if (!sandboxId || !fileList?.length || uploading) return
    const incomingFiles = Array.from(fileList)
    setUploading(true)
    setUploadStatus({ current: 0, total: incomingFiles.length, filename: incomingFiles[0]?.name || '文件' })
    setError('')
    try {
      for (const [index, file] of incomingFiles.entries()) {
        setUploadStatus({ current: index + 1, total: incomingFiles.length, filename: file.name })
        await uploadTaskFile(sandboxId, file, getRelativePath(file))
      }
      window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      await loadFiles()
    } catch (err) {
      console.error('Failed to upload sandbox files', err)
      setError('添加文件失败')
    } finally {
      setUploading(false)
      setUploadStatus(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!isNativeShell()) return
    let disposed = false
    let unlisten: (() => void) | null = null

    const uploadDroppedPaths = async (paths: string[]) => {
      if (!sandboxId || !paths.length || uploading) return
      setLocalFileDragOver(false)
      setUploading(true)
      setUploadStatus({ current: 0, total: paths.length, filename: '读取本地文件...' })
      setError('')
      try {
        const droppedFiles = await invoke<NativeDroppedFile[]>('read_dropped_files', { paths })
        for (const [index, droppedFile] of droppedFiles.entries()) {
          setUploadStatus({ current: index + 1, total: droppedFiles.length, filename: droppedFile.filename })
          const bytes = Uint8Array.from(droppedFile.bytes)
          const file = new File([bytes], droppedFile.filename)
          await uploadTaskFile(sandboxId, file, droppedFile.filename)
        }
        window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
        await loadFiles()
      } catch (err) {
        console.error('Failed to upload native dropped files', err)
        setError('拖拽上传失败')
      } finally {
        setUploading(false)
        setUploadStatus(null)
      }
    }

    void getCurrentWindow()
      .onDragDropEvent((event) => {
        if (disposed) return
        if (event.payload.type === 'over') {
          if (sandboxId && !uploading) setLocalFileDragOver(true)
          return
        }
        if (event.payload.type === 'leave') {
          setLocalFileDragOver(false)
          return
        }
        if (event.payload.type === 'drop') {
          void uploadDroppedPaths(event.payload.paths)
        }
      })
      .then((dispose) => {
        if (disposed) {
          dispose()
          return
        }
        unlisten = dispose
      })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [sandboxId, uploading])

  const handleCreateEntry = async (kind: 'file' | 'folder') => {
    if (!sandboxId) return
    setCreateMenuOpen(false)
    const fallback = kind === 'file' ? 'untitled.md' : '新建文件夹'
    const label = kind === 'file' ? '文件名' : '文件夹名'
    const rawName = window.prompt(`请输入${label}`, fallback)
    const filename = rawName?.trim()
    if (!filename) return
    setUploading(true)
    setError('')
    try {
      await createTaskFile(sandboxId, { filename, kind, content: '' })
      window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      await loadFiles()
    } catch (err) {
      console.error('Failed to create sandbox file entry', err)
      setError(kind === 'file' ? '创建文件失败，可能已存在同名文件。' : '创建文件夹失败，可能已存在同名文件夹。')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (file: AgentFile) => {
    setFileContextMenu(null)
    if (!window.confirm(`删除文件「${file.filename}」？`)) return
    setError('')
    try {
      await deleteTaskFile(file.id)
      setFileOrder((current) => current.filter((id) => id !== file.id))
      if (selectedFileId === file.id) onSelectFile(0, null)
      window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      await loadFiles()
    } catch (err) {
      console.error('Failed to delete sandbox file', err)
      setError('删除文件失败')
    }
  }

  const handleDownloadFile = async (file: AgentFile) => {
    setFileContextMenu(null)
    setError('')
    try {
      const res = await downloadFileBlob(file.id)
      downloadBlob(res.data, file.filename.split('/').filter(Boolean).at(-1) || file.filename || 'download')
    } catch (err) {
      console.error('Failed to download sandbox file', err)
      setError('下载文件失败')
    }
  }

  const handleResultTextDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!isResultTextDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = sandboxId && !uploading ? 'copy' : 'none'
    if (sandboxId && !uploading) setResultTextDragOver(true)
  }

  const handleResultTextDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!isResultTextDrag(event)) return
    const current = event.currentTarget
    const related = event.relatedTarget
    if (related instanceof Node && current.contains(related)) return
    setResultTextDragOver(false)
  }

  const handleResultTextDrop = async (event: React.DragEvent<HTMLElement>) => {
    if (!isResultTextDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    setResultTextDragOver(false)
    if (!sandboxId || uploading) return
    const content = event.dataTransfer.getData(RESULT_TEXT_DRAG_TYPE) || event.dataTransfer.getData('text/plain')
    const text = content.trim()
    if (!text) return
    const filename = `result-${formatTimestampForFilename(new Date())}.md`
    setUploading(true)
    setError('')
    try {
      await createTaskFile(sandboxId, { filename, kind: 'file', content: text.endsWith('\n') ? text : `${text}\n` })
      window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      await loadFiles()
    } catch (err) {
      console.error('Failed to create file from result text', err)
      setError('从结果创建文件失败')
    } finally {
      setUploading(false)
    }
  }

  const handleLocalFileDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!isLocalFileDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = sandboxId && !uploading ? 'copy' : 'none'
    if (sandboxId && !uploading) setLocalFileDragOver(true)
  }

  const handleLocalFileDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!isLocalFileDrag(event)) return
    const current = event.currentTarget
    const related = event.relatedTarget
    if (related instanceof Node && current.contains(related)) return
    setLocalFileDragOver(false)
  }

  const handleLocalFileDrop = (event: React.DragEvent<HTMLElement>) => {
    if (!isLocalFileDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    setLocalFileDragOver(false)
    void handleAddFiles(event.dataTransfer.files)
  }

  const renderNode = (node: FileTreeNode, depth = 0): JSX.Element => {
    const paddingLeft = 14 + depth * 14
    if (node.type === 'folder') {
      const expanded = expandedFolders[node.path] ?? true
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleFolder(node.path)}
            className="flex h-8 w-full items-center gap-2 rounded-lg text-left text-[12px] text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            style={{ paddingLeft }}
          >
            <Icon name="chevronRight" className={['h-3.5 w-3.5 transition-transform', expanded ? 'rotate-90' : 'rotate-0'].join(' ')} />
            <Icon name="folder" className="h-3.5 w-3.5" />
            <span className="truncate">{node.name}</span>
          </button>
          {expanded ? node.children?.map((child) => renderNode(child, depth + 1)) : null}
        </div>
      )
    }

    const file = node.file as AgentFile
    const selected = file.id === selectedFileId
    return (
      <div
        key={node.path}
        role="button"
        tabIndex={0}
        onClick={() => selectFile(file)}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setCreateMenuOpen(false)
          setFileContextMenu({ x: event.clientX, y: event.clientY, file })
        }}
        draggable
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') selectFile(file)
        }}
        onDragStart={(event) => handleFileDragStart(event, file)}
        onDragOver={(event) => {
          if (isLocalFileDrag(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(event) => {
          if (isLocalFileDrag(event)) return
          moveFile(file.id)
        }}
        onDragEnd={() => {
          setDraggedFileId(null)
          clearActiveSandboxFileDrag()
        }}
        className={[
          'flex h-8 w-full items-center gap-2 rounded-lg text-left text-[12px] transition',
          'cursor-grab active:cursor-grabbing',
          draggedFileId === file.id ? 'opacity-45 ring-1 ring-cyan-200' : '',
          selected ? 'bg-cyan-50 text-cyan-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')}
        style={{ paddingLeft }}
      >
        <Icon name="file" className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {isLayoutPreviewFile(file.filename, file.mime_type) ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 pr-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                requestDocumentPreviewUpdate(file)
              }}
              className="h-6 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              title="检查文件哈希，必要时同步图片缓存"
            >
              更新
            </button>
          </span>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            void handleDownloadFile(file)
          }}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-cyan-700"
          title="下载文件"
        >
          <Icon name="download" className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="flex flex-1 flex-col items-center gap-3 px-2 py-3">
        <button
          type="button"
          onClick={() => void loadFiles()}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
          title="刷新文件"
        >
          <Icon name="refresh" className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pb-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Explorer</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">当前沙盒</p>
            </div>
            <button
              type="button"
              onClick={() => void loadFiles()}
              disabled={loading}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
              title="刷新文件"
            >
              <Icon name="refresh" className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
            </button>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setSandboxMenuOpen((current) => !current)}
              className="flex w-full items-center gap-3 rounded-full border border-cyan-100 bg-cyan-50/70 px-3 py-2.5 text-left text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-cyan-700">
                <Icon name="sandbox" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-slate-400">当前沙盒</span>
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {activeSandbox?.title || sandboxName || '未选择沙盒'}
                </span>
              </span>
              <Icon
                name="chevronDown"
                className={['h-4 w-4 shrink-0 text-slate-400 transition-transform', sandboxMenuOpen ? 'rotate-180' : 'rotate-0'].join(' ')}
              />
            </button>

            {sandboxMenuOpen ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <div className="max-h-60 overflow-y-auto p-2">
                  {loadingSandboxes ? (
                    <p className="px-3 py-3 text-xs text-slate-500">正在加载沙盒...</p>
                  ) : sandboxOptions.length ? (
                    sandboxOptions.map((sandbox) => {
                      const active = sandbox.id === sandboxId
                      return (
                        <button
                          key={sandbox.id}
                          type="button"
                          onClick={() => {
                            onSelectSandbox(sandbox.id, sandbox)
                            setSandboxMenuOpen(false)
                          }}
                          className={[
                            'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                            active ? 'bg-cyan-50 text-slate-950' : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                              active ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-500',
                            ].join(' ')}
                          >
                            <Icon name="sandbox" className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">{sandbox.title || `沙盒 #${sandbox.id}`}</span>
                              {active ? (
                                <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-white">当前</span>
                              ) : null}
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-500">{sandbox.status}</span>
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="px-3 py-3 text-xs leading-5 text-slate-500">当前工作空间还没有沙盒。</p>
                  )}
                </div>
                <div className="border-t border-slate-100 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxMenuOpen(false)
                      onOpenSandboxManage()
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon name="settings" className="h-4 w-4" />
                      沙盒管理
                    </span>
                    <Icon name="chevronRight" className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative mt-3">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="搜索文件"
            />
          </div>
          {searchKeyword ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Search Results</p>
                <span className="text-[11px] text-slate-400">{filteredFiles.length} 个匹配</span>
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5">
                {searchResults.length ? (
                  searchResults.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => selectFile(file)}
                      draggable
                      onDragStart={(event) => handleFileDragStart(event, file)}
                      onDragOver={(event) => {
                        if (isLocalFileDrag(event)) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                      }}
                      onDrop={(event) => {
                        if (isLocalFileDrag(event)) return
                        moveFile(file.id)
                      }}
                      onDragEnd={() => {
                        setDraggedFileId(null)
                        clearActiveSandboxFileDrag()
                      }}
                      className={[
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition',
                        'cursor-grab active:cursor-grabbing',
                        draggedFileId === file.id ? 'opacity-45 ring-1 ring-cyan-200' : '',
                        file.id === selectedFileId
                          ? 'bg-cyan-50 text-cyan-800'
                          : 'text-slate-700 hover:bg-white hover:text-slate-950',
                      ].join(' ')}
                    >
                      <Icon name="file" className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{file.filename}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {formatFileSize(file.size)} · 沙盒 #{file.task_id}
                        </span>
                      </span>
                      <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
                  ))
                ) : (
                  <p className="px-2.5 py-3 text-xs text-slate-500">没有匹配的文件。</p>
                )}
              </div>
              {filteredFiles.length > searchResults.length ? (
                <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-400">
                  继续输入可以缩小结果范围。
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <div
          onDragEnter={handleLocalFileDragOver}
          onDragOver={(event) => {
            handleLocalFileDragOver(event)
            handleResultTextDragOver(event)
          }}
          onDragLeave={(event) => {
            handleLocalFileDragLeave(event)
            handleResultTextDragLeave(event)
          }}
          onDrop={(event) => {
            if (isResultTextDrag(event)) {
              void handleResultTextDrop(event)
              return
            }
            handleLocalFileDrop(event)
          }}
          className={[
            'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition',
            localFileDragOver || resultTextDragOver ? 'border-cyan-300 ring-4 ring-cyan-100' : 'border-slate-200',
          ].join(' ')}
        >
          {localFileDragOver || resultTextDragOver ? (
            <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/90 backdrop-blur-sm">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-cyan-700 shadow-sm">
                  <Icon name={resultTextDragOver ? 'file' : 'upload'} className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {resultTextDragOver ? '松开创建结果文件' : '松开上传到当前沙盒'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {resultTextDragOver ? '会保存为 Markdown 文件' : '支持一次拖入多个本地文件'}
                </p>
              </div>
            </div>
          ) : null}
          {uploadStatus ? (
            <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-2xl border border-cyan-200 bg-white/90 backdrop-blur-sm">
              <div className="w-[82%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                    <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">正在上传文件</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {uploadStatus.current} / {uploadStatus.total} · {uploadStatus.filename}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-[width] duration-200"
                    style={{ width: `${Math.max(5, (uploadStatus.current / Math.max(uploadStatus.total, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sandbox Files</p>
              <p className="mt-1 text-xs text-slate-500">{sandboxId ? `${visibleFiles.length} 个文件` : '未选择沙盒'}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void handleAddFiles(event.target.files)}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setCreateMenuOpen((current) => !current)
                    setFileContextMenu(null)
                  }}
                  disabled={!sandboxId || uploading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={sandboxId ? '创建新文件或文件夹' : '先选择沙盒'}
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  新建
                </button>
                {createMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.4rem)] z-30 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => void handleCreateEntry('file')}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700"
                    >
                      <Icon name="file" className="h-3.5 w-3.5" />
                      新建文件
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCreateEntry('folder')}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700"
                    >
                      <Icon name="folder" className="h-3.5 w-3.5" />
                      新建文件夹
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!sandboxId || uploading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                title={sandboxId ? '添加文件到当前沙盒' : '先选择沙盒'}
              >
                <Icon name={uploading ? 'refresh' : 'upload'} className={['h-3.5 w-3.5', uploading ? 'animate-spin' : ''].join(' ')} />
                {uploading ? '上传中' : '添加'}
              </button>
              <button
                type="button"
                onClick={() => selectedFile && void handleDownloadFile(selectedFile)}
                disabled={!selectedFile || uploading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                title={selectedFile ? '下载选中文件' : '先选择文件'}
              >
                <Icon name="download" className="h-3.5 w-3.5" />
                下载
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {error ? <p className="px-2 py-3 text-xs text-rose-600">{error}</p> : null}
            {!error && loading ? <p className="px-2 py-3 text-xs text-slate-500">正在加载文件...</p> : null}
            {!error && !loading && !sandboxId ? (
              <p className="px-2 py-3 text-xs leading-6 text-slate-500">先在右侧选择一个沙盒，这里再显示该沙盒里的文件。</p>
            ) : null}
            {!error && !loading && sandboxId && !filteredFiles.length ? (
              <div className="m-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center">
                <p className="text-xs leading-5 text-slate-500">当前沙盒还没有文件。</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">点击“添加文件”，或直接把本地文件拖到这里上传。</p>
              </div>
            ) : null}
            {!error && !loading && sandboxId ? tree.map((node) => renderNode(node)) : null}
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Screenshot</p>
            {selectedFile ? (
              <div className="mt-2">
                <p className="truncate text-sm font-semibold text-slate-950">{selectedFile.filename}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)} · 沙盒 #{selectedFile.task_id}
                </p>
                <button
                  type="button"
                  onClick={() => captureSelectedPreview(selectedFile)}
                  disabled={!selectedFileSupportsScreenshot}
                  className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  title={selectedFileSupportsScreenshot ? '在预览图上框选区域截图' : '仅支持图片、PDF、PPT、Word、Excel 预览截图'}
                >
                  <Icon name="camera" className="h-4 w-4" />
                  区域截图
                </button>
                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  {selectedFileSupportsScreenshot
                    ? '在预览图上框选区域，复制 PNG 到系统剪贴板。'
                    : '文本和普通文件不生成图片预览，无法区域截图。'}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">选择文件后可框选预览区域并复制到剪贴板。</p>
            )}
          </div>
        </div>
      </div>
      {fileContextMenu ? (
        <div
          className="fixed z-50 min-w-[150px] rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
          style={{ left: fileContextMenu.x, top: fileContextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            onClick={() => void handleDownloadFile(fileContextMenu.file)}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            下载文件
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteFile(fileContextMenu.file)}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
            删除文件
          </button>
        </div>
      ) : null}
    </div>
  )
}

function buildFileTree(files: AgentFile[], fileOrder: number[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const file of files) {
    const rawParts = file.filename.split('/').filter(Boolean)
    const folderMarker = isFolderMarker(file)
    const parts = folderMarker ? rawParts.slice(0, -1) : rawParts
    if (!parts.length) continue
    let currentLevel = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLeaf = index === parts.length - 1
      let existing = currentLevel.find((node) => node.path === currentPath)
      if (!existing) {
        existing = isLeaf && !folderMarker
          ? { name: part, path: currentPath, type: 'file', file }
          : { name: part, path: currentPath, type: 'folder', children: [] }
        currentLevel.push(existing)
      }
      if (!isLeaf || folderMarker) {
        currentLevel = existing.children ?? []
        existing.children = currentLevel
      }
    })
  }

  return sortNodes(root, fileOrder)
}

function sortNodes(nodes: FileTreeNode[], fileOrder: number[]): FileTreeNode[] {
  const fileIndex = new Map(fileOrder.map((id, index) => [id, index]))
  return [...nodes]
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      if (a.type === 'file' && b.type === 'file') {
        const aId = a.file?.id
        const bId = b.file?.id
        const aIndex = aId ? fileIndex.get(aId) : undefined
        const bIndex = bId ? fileIndex.get(bId) : undefined
        if (aIndex !== undefined || bIndex !== undefined) {
          if (aIndex === undefined) return 1
          if (bIndex === undefined) return -1
          return aIndex - bIndex
        }
      }
      return a.name.localeCompare(b.name, 'zh-CN')
    })
    .map((node) =>
      node.type === 'folder'
        ? { ...node, children: sortNodes(node.children || [], fileOrder) }
        : node,
    )
}

function sortFilesByStoredOrder(files: AgentFile[], fileOrder: number[]) {
  const fileIndex = new Map(fileOrder.map((id, index) => [id, index]))
  return [...files].sort((a, b) => {
    const aIndex = fileIndex.get(a.id)
    const bIndex = fileIndex.get(b.id)
    if (aIndex !== undefined || bIndex !== undefined) {
      if (aIndex === undefined) return 1
      if (bIndex === undefined) return -1
      return aIndex - bIndex
    }
    return a.filename.localeCompare(b.filename, 'zh-CN')
  })
}

function reorderFileIds(ids: number[], draggedId: number, targetId: number) {
  const base = Array.from(new Set(ids))
  if (!base.includes(draggedId)) base.push(draggedId)
  if (!base.includes(targetId)) base.push(targetId)
  const next = [...base]
  const fromIndex = next.indexOf(draggedId)
  const toIndex = next.indexOf(targetId)
  if (fromIndex === -1 || toIndex === -1) return next
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function readStoredFileOrder(workspaceId: number) {
  try {
    const raw = localStorage.getItem(`${FILE_ORDER_STORAGE_PREFIX}${workspaceId}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === 'number') : []
  } catch {
    return []
  }
}

function getParentTaskId(sandbox: WorkspaceTaskSummary) {
  const value = sandbox.input?.parent_task_id
  return typeof value === 'number' ? value : null
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getRelativePath(file: File) {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/^\/+/, '')
}

function isLocalFileDrag(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types || []).includes('Files')
}

function supportsPreviewScreenshot(file: AgentFile) {
  if (isLayoutPreviewFile(file.filename, file.mime_type)) return true
  if (file.mime_type?.startsWith('image/')) return true
  const suffix = file.filename.split('.').pop()?.toLowerCase()
  return Boolean(suffix && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(suffix))
}

function isResultTextDrag(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types || []).includes(RESULT_TEXT_DRAG_TYPE)
}

function formatTimestampForFilename(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function isFolderMarker(file: AgentFile) {
  return file.source === 'folder' || file.filename.split('/').pop() === FOLDER_MARKER_NAME
}
