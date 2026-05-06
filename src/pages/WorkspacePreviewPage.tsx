import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AgentFile, FilePreview } from '../types'
import { getFilePreview } from '../api/files'
import { uploadTaskFile } from '../api/tasks'
import { Icon, Panel } from '../components/WensaiUI'
import {
  cacheCloudDocumentPreview,
  inspectDocumentPreviewCache,
  isLayoutPreviewFile,
} from '../utils/localDocumentPreview'
import { readBlobAsText, syncLocalPreviewFile } from '../utils/localFileCache'

interface WorkspacePreviewPageProps {
  fileId?: number | null
  fileMeta?: AgentFile | null
  onClose?: () => void
}

interface LocalPreview {
  id: number
  filename: string
  mime_type: string | null
  size: number
  mode: 'text' | 'image' | 'gallery' | 'pdf' | 'download'
  content: string | null
  page_count: number
  page_image_urls: string[]
  message: string | null
}

interface ScreenshotSelection {
  left: number
  top: number
  width: number
  height: number
}

interface UpdateNotice {
  type: 'success' | 'error'
  message: string
}

export default function WorkspacePreviewPage({ fileId: controlledFileId, fileMeta, onClose }: WorkspacePreviewPageProps = {}) {
  const params = useParams()
  const [preview, setPreview] = useState<LocalPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [localObjectUrl, setLocalObjectUrl] = useState('')
  const [localText, setLocalText] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [parsing, setParsing] = useState(false)
  const [screenshotSelecting, setScreenshotSelecting] = useState(false)
  const [updateNotice, setUpdateNotice] = useState<UpdateNotice | null>(null)
  const activePreviewImageRef = useRef<HTMLImageElement | null>(null)
  const updateNoticeTimerRef = useRef<number | null>(null)

  const numericFileId = controlledFileId ?? (params.fileId ? Number(params.fileId) : null)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!numericFileId) return
      setLoading(true)
      setError('')
      setPreview(null)
      setSyncMessage('')
      setLocalText('')
      setLocalObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return ''
      })
      try {
        if (!fileMeta) {
          throw new Error('LOCAL_FILE_META_REQUIRED')
        }

        const basePreview = {
          id: fileMeta.id,
          filename: fileMeta.filename,
          mime_type: fileMeta.mime_type,
          size: fileMeta.size,
          content: null,
          page_count: 0,
          page_image_urls: [],
        }

        if (isLayoutPreviewFile(fileMeta.filename, fileMeta.mime_type)) {
          try {
            const cacheInspection = await inspectDocumentPreviewCache(fileMeta)
            if (!active) return
            if (cacheInspection.status === 'valid' && cacheInspection.result) {
              setPreview({
                ...basePreview,
                mode: 'gallery',
                page_count: cacheInspection.result.pageImageUrls.length,
                page_image_urls: cacheInspection.result.pageImageUrls,
                message: cacheInspection.result.message,
              })
              setSyncMessage(cacheInspection.message)
              return
            }

            setSyncMessage(cacheInspection.message)
            const cloudPreview = await syncCloudDocumentPreview(fileMeta)
            if (!active) return
            setPreview({
              ...basePreview,
              mode: cloudPreview.mode,
              content: cloudPreview.content,
              page_count: cloudPreview.page_count,
              page_image_urls: cloudPreview.page_image_urls,
              message: cloudPreview.message || '云端已返回文件预览。',
            })
            setSyncMessage(cloudPreview.message || '已从云端同步图片缓存')
            return
          } catch (previewErr) {
            console.error('Failed to load cloud document preview', previewErr)
            if (!active) return
            setPreview({
              ...basePreview,
              mode: 'download',
              message: formatPreviewError(previewErr),
            })
            return
          }
        }

        setSyncMessage('正在从云端下载并校验本地缓存...')
        const synced = await syncLocalPreviewFile(fileMeta)
        setLocalObjectUrl(synced.objectUrl)
        setSyncMessage(`${synced.updated ? '已下载并校验本地文件' : '本地文件已是最新'}：${synced.localPath}`)

        if (isTextLikeFile(fileMeta.filename, fileMeta.mime_type)) {
          const text = await readBlobAsText(synced.blob)
          if (!active) return
          setLocalText(text)
          setPreview({ ...basePreview, mode: 'text', content: text, message: '已从本地缓存读取文本。' })
        } else if (isImageFile(fileMeta.filename, fileMeta.mime_type)) {
          if (!active) return
          setPreview({ ...basePreview, mode: 'image', message: '已从本地缓存读取图片。' })
        } else {
          if (!active) return
          setPreview({ ...basePreview, mode: 'download', message: '当前文件已同步到本地，但暂不支持直接预览。' })
        }
      } catch (err) {
        console.error('Failed to load sandbox preview', err)
        if (!active) return
        setError(formatPreviewError(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [numericFileId, fileMeta])

  useEffect(() => {
    const handleUpdateRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ fileId?: number }>).detail
      if (!detail?.fileId || detail.fileId !== numericFileId || !fileMeta) return
      void updateCloudDocumentPreview()
    }
    const handleCacheStatusRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ fileId?: number }>).detail
      if (!detail?.fileId || detail.fileId !== numericFileId || !fileMeta) return
      void refreshCloudDocumentPreview()
    }
    window.addEventListener('wensai:update-document-preview', handleUpdateRequest)
    window.addEventListener('wensai:check-document-preview-cache', handleCacheStatusRequest)
    return () => {
      window.removeEventListener('wensai:update-document-preview', handleUpdateRequest)
      window.removeEventListener('wensai:check-document-preview-cache', handleCacheStatusRequest)
    }
  }, [numericFileId, fileMeta, localObjectUrl])

  useEffect(() => {
    return () => {
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl)
    }
  }, [localObjectUrl])

  useEffect(() => {
    return () => {
      if (updateNoticeTimerRef.current) window.clearTimeout(updateNoticeTimerRef.current)
    }
  }, [])

  const extractedText = preview?.content?.trim() || ''
  const pageImageUrls = Array.isArray(preview?.page_image_urls) ? preview.page_image_urls : []
  const preferredText = localText.trim() || extractedText
  const visibleText = preferredText.length > 120000 ? `${preferredText.slice(0, 120000)}\n\n...内容较长，已截断显示。` : preferredText
  const totalPages = preview?.page_count || pageImageUrls.length
  const currentPageIndex = Math.min(activePage, Math.max(pageImageUrls.length - 1, 0))
  const currentPageUrl = pageImageUrls[currentPageIndex] || null

  useEffect(() => {
    const handleScreenshotRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ fileId?: number }>).detail
      if (!detail?.fileId || detail.fileId !== numericFileId || !fileMeta) return
      setScreenshotSelecting(true)
      setSyncMessage('拖动选择截图区域，松开后复制到剪贴板。')
    }
    window.addEventListener('wensai:start-preview-screenshot-selection', handleScreenshotRequest)
    return () => window.removeEventListener('wensai:start-preview-screenshot-selection', handleScreenshotRequest)
  }, [numericFileId, fileMeta])

  useEffect(() => {
    setActivePage(0)
  }, [numericFileId])

  useEffect(() => {
    if (totalPages > 0 && activePage >= totalPages) {
      setActivePage(totalPages - 1)
    }
  }, [activePage, totalPages])

  useEffect(() => {
    setZoom(1)
  }, [numericFileId, preview?.id, activePage])

  const zoomIn = () => setZoom((current) => Math.min(Number((current + 0.25).toFixed(2)), 4))
  const zoomOut = () => setZoom((current) => Math.max(Number((current - 0.25).toFixed(2)), 0.5))
  const resetZoom = () => setZoom(1)

  const showUpdateNotice = (notice: UpdateNotice) => {
    setUpdateNotice(notice)
    if (updateNoticeTimerRef.current) window.clearTimeout(updateNoticeTimerRef.current)
    updateNoticeTimerRef.current = window.setTimeout(() => {
      setUpdateNotice(null)
      updateNoticeTimerRef.current = null
    }, 3200)
  }

  const refreshCloudDocumentPreview = async () => {
    if (!fileMeta || !isLayoutPreviewFile(fileMeta.filename, fileMeta.mime_type)) return
    try {
      const cacheInspection = await inspectDocumentPreviewCache(fileMeta)
      if (cacheInspection.status === 'valid' && cacheInspection.result) {
        setPreview({
          id: fileMeta.id,
          filename: fileMeta.filename,
          mime_type: fileMeta.mime_type,
          size: fileMeta.size,
          mode: 'gallery',
          content: null,
          page_count: cacheInspection.result.pageImageUrls.length,
          page_image_urls: cacheInspection.result.pageImageUrls,
          message: cacheInspection.result.message,
        })
        setSyncMessage(cacheInspection.message)
        return
      }

      setSyncMessage(cacheInspection.message)
      const cloudPreview = await syncCloudDocumentPreview(fileMeta)
      setPreview({
        id: fileMeta.id,
        filename: fileMeta.filename,
        mime_type: fileMeta.mime_type,
        size: fileMeta.size,
        mode: cloudPreview.mode,
        content: cloudPreview.content,
        page_count: cloudPreview.page_count,
        page_image_urls: cloudPreview.page_image_urls,
        message: cloudPreview.message || '云端已返回文件预览。',
      })
      setSyncMessage(cloudPreview.message || '已从云端同步图片缓存')
    } catch (err) {
      setSyncMessage(formatPreviewError(err))
    }
  }

  const updateCloudDocumentPreview = async () => {
    if (!fileMeta || !isLayoutPreviewFile(fileMeta.filename, fileMeta.mime_type) || parsing) return
    setParsing(true)
    setError('')
    try {
      const cacheInspection = await inspectDocumentPreviewCache(fileMeta)
      if (cacheInspection.status === 'valid' && cacheInspection.result) {
        setPreview({
          id: fileMeta.id,
          filename: fileMeta.filename,
          mime_type: fileMeta.mime_type,
          size: fileMeta.size,
          mode: 'gallery',
          content: null,
          page_count: cacheInspection.result.pageImageUrls.length,
          page_image_urls: cacheInspection.result.pageImageUrls,
          message: cacheInspection.result.message,
        })
        setSyncMessage(cacheInspection.message)
        showUpdateNotice({ type: 'success', message: '更新成功：本地缓存已是最新。' })
        return
      }

      setSyncMessage(cacheInspection.message)
      const localPreview = await syncCloudDocumentPreview(fileMeta)
      setPreview({
        id: fileMeta.id,
        filename: fileMeta.filename,
        mime_type: fileMeta.mime_type,
        size: fileMeta.size,
        mode: localPreview.mode,
        content: localPreview.content,
        page_count: localPreview.page_count,
        page_image_urls: localPreview.page_image_urls,
        message: localPreview.message,
      })
      setSyncMessage(localPreview.message || '已从云端同步图片缓存')
      showUpdateNotice({ type: 'success', message: '更新成功：已同步最新预览。' })
    } catch (previewErr) {
      console.error('Failed to update cloud document preview', previewErr)
      const message = formatPreviewError(previewErr)
      setError(message)
      showUpdateNotice({ type: 'error', message: `更新失败：${message}` })
    } finally {
      setParsing(false)
    }
  }

  const captureSelectionToClipboard = async (selection: ScreenshotSelection) => {
    const image = activePreviewImageRef.current
    if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
      setSyncMessage('当前预览图片还未加载完成，稍后再截图。')
      return
    }

    try {
      setSyncMessage('正在复制截图到剪贴板...')
      const imageRect = image.getBoundingClientRect()
      const left = Math.max(selection.left, imageRect.left)
      const top = Math.max(selection.top, imageRect.top)
      const right = Math.min(selection.left + selection.width, imageRect.right)
      const bottom = Math.min(selection.top + selection.height, imageRect.bottom)
      const width = Math.max(0, right - left)
      const height = Math.max(0, bottom - top)
      if (width < 4 || height < 4) {
        setSyncMessage('截图区域太小，请重新框选。')
        return
      }

      const scaleX = image.naturalWidth / imageRect.width
      const scaleY = image.naturalHeight / imageRect.height
      const sourceX = Math.max(0, Math.round((left - imageRect.left) * scaleX))
      const sourceY = Math.max(0, Math.round((top - imageRect.top) * scaleY))
      const sourceWidth = Math.min(image.naturalWidth - sourceX, Math.round(width * scaleX))
      const sourceHeight = Math.min(image.naturalHeight - sourceY, Math.round(height * scaleY))

      const canvas = document.createElement('canvas')
      canvas.width = sourceWidth
      canvas.height = sourceHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('无法创建截图画布')
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight)
      const blob = canvasToPngBlob(canvas)
      const filename = buildScreenshotFilename(fileMeta?.filename || preview?.filename || 'preview')

      let clipboardError: unknown = null
      try {
        await writePngToClipboard(blob)
      } catch (err) {
        clipboardError = err
      }

      if (fileMeta?.task_id) {
        const file = new File([blob], filename, { type: 'image/png' })
        await uploadTaskFile(fileMeta.task_id, file, `screenshots/${filename}`)
        window.dispatchEvent(new CustomEvent('wensai:sandbox-files-changed'))
      }

      if (clipboardError) {
        if (!fileMeta?.task_id) throw clipboardError
        setSyncMessage(`截图已保存到沙盒文件：screenshots/${filename}。${formatClipboardError(clipboardError)}`)
      } else {
        setSyncMessage(fileMeta?.task_id ? `截图已保存到沙盒文件：screenshots/${filename}，并已复制到剪贴板。` : '截图已复制到系统剪贴板。')
      }
    } catch (err) {
      console.error('Failed to capture preview screenshot', err)
      setSyncMessage(formatClipboardError(err))
    } finally {
      setScreenshotSelecting(false)
    }
  }

  if (!numericFileId) {
    return null
  }

  return (
    <div className="min-h-full bg-[#f3f6fb] p-3 md:p-4">
      {updateNotice ? (
        <div
          role={updateNotice.type === 'error' ? 'alert' : 'status'}
          className={[
            'fixed right-5 top-5 z-50 max-w-[320px] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur',
            updateNotice.type === 'error'
              ? 'border-rose-200 bg-rose-50/95 text-rose-700'
              : 'border-emerald-200 bg-emerald-50/95 text-emerald-700',
          ].join(' ')}
        >
          {updateNotice.message}
        </div>
      ) : null}
      <div className="w-full">
        <Panel className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Editor</p>
                <h1 className="mt-1.5 truncate text-base font-semibold text-slate-950">
                  {fileMeta?.filename || preview?.filename || `文件 #${numericFileId}`}
                </h1>
                {fileMeta ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(fileMeta.size)} · 来自沙盒 #{fileMeta.task_id}
                  </p>
                ) : null}
                {syncMessage ? (
                  <p className="mt-1 text-xs text-cyan-700">{syncMessage}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {fileMeta && isLayoutPreviewFile(fileMeta.filename, fileMeta.mime_type) ? (
                  <button
                    type="button"
                    onClick={() => void updateCloudDocumentPreview()}
                    disabled={parsing}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-100 bg-cyan-50 px-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60"
                    title="检查是否需要更新本地图片缓存"
                  >
                    <Icon name="refresh" className={['h-3.5 w-3.5', parsing ? 'animate-spin' : ''].join(' ')} />
                    {parsing ? '检查中' : '更新'}
                  </button>
                ) : null}
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    title="折叠预览"
                  >
                    <Icon name="collapseRight" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-[#f8fafc] p-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500">正在生成文件预览...</div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-sm text-rose-700">{error}</div>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">统一预览</p>
                    {preview?.mode === 'gallery' ? (
                      <p className="mt-1 text-xs text-slate-400">PDF / PPT / Word 已在云端解析成图片逐页预览</p>
                    ) : preview?.mode === 'pdf' ? (
                      <p className="mt-1 text-xs text-slate-400">本地 PDF 直接预览，不使用云端预览</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-400">
                    {preview?.mode === 'gallery'
                      ? `${preview.page_count || pageImageUrls.length} 页`
                      : extractedText
                        ? `${extractedText.length.toLocaleString()} 字符`
                        : '预览'}
                  </span>
                </div>

                <div className="p-3">
                  {preview?.mode === 'gallery' && currentPageUrl ? (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-500">
                          <span>第 {currentPageIndex + 1} 页</span>
                          <div className="flex items-center gap-3">
                            <span className="max-w-[180px] truncate">{preview.filename}</span>
                            <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
                          </div>
                        </div>
                        <ZoomableImage
                          src={currentPageUrl}
                          alt={`${preview.filename}-${currentPageIndex + 1}`}
                          zoom={zoom}
                          onZoomChange={setZoom}
                          previewImageRef={activePreviewImageRef}
                          selecting={screenshotSelecting}
                          onSelectionComplete={captureSelectionToClipboard}
                          onSelectionCancel={() => {
                            setScreenshotSelecting(false)
                            setSyncMessage('已取消截图选择。')
                          }}
                        />
                      </div>

                      {totalPages > 1 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setActivePage((current) => Math.max(current - 1, 0))}
                              disabled={currentPageIndex === 0}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Icon name="chevronLeft" className="h-3.5 w-3.5" />
                              上一页
                            </button>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                              图 {currentPageIndex + 1} / {totalPages}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActivePage((current) => Math.min(current + 1, totalPages - 1))}
                              disabled={currentPageIndex >= totalPages - 1}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              下一页
                              <Icon name="chevronRight" className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
                              <span>图 1</span>
                              <span>拖动切换图片</span>
                              <span>图 {totalPages}</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={totalPages}
                              step={1}
                              value={currentPageIndex + 1}
                              onChange={(event) => setActivePage(Number(event.target.value) - 1)}
                              className="document-page-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-950"
                              style={{
                                background: `linear-gradient(to right, #020617 0%, #020617 ${totalPages > 1 ? (currentPageIndex / (totalPages - 1)) * 100 : 0}%, #e2e8f0 ${totalPages > 1 ? (currentPageIndex / (totalPages - 1)) * 100 : 0}%, #e2e8f0 100%)`,
                              }}
                              aria-label="切换预览图片页码"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : preview?.mode === 'pdf' && localObjectUrl ? (
                    <iframe
                      title={preview.filename}
                      src={localObjectUrl}
                      className="h-[760px] w-full rounded-xl border border-slate-200 bg-white"
                    />
                  ) : preview?.mode === 'image' && localObjectUrl ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-end border-b border-slate-100 px-4 py-2">
                        <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
                      </div>
                      <ZoomableImage
                        src={localObjectUrl}
                        alt={preview.filename}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        previewImageRef={activePreviewImageRef}
                        selecting={screenshotSelecting}
                        onSelectionComplete={captureSelectionToClipboard}
                        onSelectionCancel={() => {
                          setScreenshotSelecting(false)
                          setSyncMessage('已取消截图选择。')
                        }}
                      />
                    </div>
                  ) : preview?.mode === 'text' ? (
                    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-2 text-[13px] leading-7 text-slate-700">
                      {visibleText || '暂无可提取的文字内容。'}
                    </pre>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      当前文件无法直接预览。
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs text-slate-600 shadow-sm">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= 0.5}
        className="h-7 px-2.5 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        title="缩小"
      >
        -
      </button>
      <button
        type="button"
        onClick={onReset}
        className="h-7 min-w-14 border-x border-slate-200 px-2 font-semibold transition hover:bg-slate-50"
        title="重置缩放"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= 4}
        className="h-7 px-2.5 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        title="放大"
      >
        +
      </button>
    </div>
  )
}

function ZoomableImage({
  src,
  alt,
  zoom,
  onZoomChange,
  previewImageRef,
  selecting,
  onSelectionComplete,
  onSelectionCancel,
}: {
  src: string
  alt: string
  zoom: number
  onZoomChange: React.Dispatch<React.SetStateAction<number>>
  previewImageRef?: { current: HTMLImageElement | null }
  selecting?: boolean
  onSelectionComplete?: (selection: ScreenshotSelection) => void
  onSelectionCancel?: () => void
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const selectionRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selectionBox, setSelectionBox] = useState<ScreenshotSelection | null>(null)

  const applyTransform = () => {
    const image = imageRef.current
    if (!image) return
    const pan = panRef.current
    image.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
  }

  const scheduleTransform = () => {
    if (rafRef.current !== null) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      applyTransform()
    })
  }

  useEffect(() => {
    panRef.current = { x: 0, y: 0 }
    setDragging(false)
    dragRef.current = null
    applyTransform()
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    applyTransform()
  }, [zoom])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      onZoomChange((current) => Math.min(4, Math.max(0.5, Number((current + delta).toFixed(2)))))
    }
    viewport.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleNativeWheel)
  }, [onZoomChange])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const viewport = viewportRef.current
    if (!viewport) return
    event.preventDefault()
    if (selecting) {
      selectionRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY }
      setSelectionBox({ left: event.clientX, top: event.clientY, width: 0, height: 0 })
      viewport.setPointerCapture(event.pointerId)
      return
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
    }
    viewport.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const selectionState = selectionRef.current
    if (selectionState && selectionState.pointerId === event.pointerId) {
      event.preventDefault()
      const left = Math.min(selectionState.startX, event.clientX)
      const top = Math.min(selectionState.startY, event.clientY)
      setSelectionBox({
        left,
        top,
        width: Math.abs(event.clientX - selectionState.startX),
        height: Math.abs(event.clientY - selectionState.startY),
      })
      return
    }

    const state = dragRef.current
    if (!state || state.pointerId !== event.pointerId) return
    event.preventDefault()
    panRef.current = {
      x: state.startPanX + event.clientX - state.startX,
      y: state.startPanY + event.clientY - state.startY,
    }
    scheduleTransform()
  }

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const selectionState = selectionRef.current
    if (selectionState && selectionState.pointerId === event.pointerId) {
      const viewport = viewportRef.current
      if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
      const left = Math.min(selectionState.startX, event.clientX)
      const top = Math.min(selectionState.startY, event.clientY)
      const selection = {
        left,
        top,
        width: Math.abs(event.clientX - selectionState.startX),
        height: Math.abs(event.clientY - selectionState.startY),
      }
      selectionRef.current = null
      setSelectionBox(null)
      if (selection.width < 4 || selection.height < 4) {
        onSelectionCancel?.()
        return
      }
      onSelectionComplete?.(selection)
      return
    }

    const state = dragRef.current
    const viewport = viewportRef.current
    if (!state || state.pointerId !== event.pointerId) return
    if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setDragging(false)
  }

  const setImageNode = (node: HTMLImageElement | null) => {
    imageRef.current = node
    if (previewImageRef) previewImageRef.current = node
  }

  return (
    <div
      ref={viewportRef}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      className={[
        'relative h-[560px] min-h-[320px] max-h-[56vh] select-none overflow-hidden bg-slate-100 p-3 [touch-action:none]',
        selecting ? 'cursor-crosshair' : dragging ? 'cursor-grabbing' : 'cursor-grab',
      ].join(' ')}
      title={selecting ? '拖动选择截图区域，松开复制到剪贴板' : '按住鼠标拖动查看图片，滚轮缩放'}
    >
      <div className="flex h-full w-full items-start justify-center">
        <img
          ref={setImageNode}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="max-h-none w-full max-w-none origin-top rounded-lg bg-white object-contain shadow-sm will-change-transform"
          style={{
            transform: `translate3d(0, 0, 0) scale(${zoom})`,
            transformOrigin: 'top center',
            transition: dragging ? 'none' : 'transform 120ms ease-out',
          }}
        />
      </div>
      {selecting ? (
        <div className="pointer-events-none absolute inset-0 z-10 bg-slate-950/10">
          <div className="absolute left-4 top-4 rounded-lg bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            拖动选择截图区域
          </div>
        </div>
      ) : null}
      {selectionBox ? (
        <div
          className="pointer-events-none fixed z-50 border-2 border-cyan-400 bg-cyan-300/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.25)]"
          style={{
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      ) : null}
    </div>
  )
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',', 2)[1]
  if (!base64) throw new Error('截图生成失败')

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: 'image/png' })
}

function buildScreenshotFilename(sourceName: string) {
  const basename = sourceName.split('/').filter(Boolean).pop() || 'preview'
  const stem = basename.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'preview'
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
  return `${stem}-screenshot-${timestamp}.png`
}

async function writePngToClipboard(blob: Blob) {
  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem }).ClipboardItem
  if (!navigator.clipboard?.write || !ClipboardItemCtor) {
    throw new Error('CLIPBOARD_IMAGE_UNSUPPORTED')
  }
  await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })])
}

function formatClipboardError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || '')
  if (message === 'CLIPBOARD_IMAGE_UNSUPPORTED') return '当前环境不支持图片剪贴板写入。'
  if (/not allowed|denied|permission/i.test(message)) return '剪贴板写入被系统拒绝，请检查应用权限。'
  return '截图失败：当前图片可能还在加载或剪贴板权限不可用。'
}

function normalizeCloudPreview(preview: FilePreview): LocalPreview {
  return {
    id: preview.id,
    filename: preview.filename,
    mime_type: preview.mime_type,
    size: preview.size,
    mode: preview.mode,
    content: preview.content,
    page_count: preview.page_count,
    page_image_urls: preview.page_image_urls,
    message: preview.message,
  }
}

async function syncCloudDocumentPreview(file: AgentFile): Promise<LocalPreview> {
  const cloudPreview = (await getFilePreview(file.id)).data
  const normalized = normalizeCloudPreview(cloudPreview)
  const cached = await cacheCloudDocumentPreview(file, cloudPreview)
  if (!cached) return normalized
  return {
    ...normalized,
    mode: 'gallery',
    page_count: cached.pageImageUrls.length,
    page_image_urls: cached.pageImageUrls,
    message: cloudPreview.message ? `${cloudPreview.message} ${cached.message}` : cached.message,
  }
}

function isTextLikeFile(filename: string, mimeType: string | null) {
  const suffix = filename.toLowerCase().split('.').pop()
  return Boolean(mimeType?.startsWith('text/')) || ['txt', 'md', 'tex', 'csv', 'json', 'py', 'yaml', 'yml', 'toml', 'log'].includes(suffix || '')
}

function isImageFile(filename: string, mimeType: string | null) {
  const suffix = filename.toLowerCase().split('.').pop()
  return Boolean(mimeType?.startsWith('image/')) || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(suffix || '')
}

function formatPreviewError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || '')
  if (message === 'LOCAL_FILE_CHECKSUM_MISMATCH') return '本地文件校验失败，请重新同步文件。'
  if (message === 'LOCAL_FILE_META_REQUIRED') return '缺少文件元数据，无法下载并校验本地文件。'
  return message || '加载文件预览失败'
}
