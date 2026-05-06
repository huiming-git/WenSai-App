import type { AgentFile } from '../types'

export const SANDBOX_FILE_DRAG_TYPE = 'application/x-wensai-sandbox-file'

export type SandboxFileDragPayload = Pick<AgentFile, 'id' | 'task_id' | 'filename' | 'mime_type' | 'size' | 'source'>

let activeSandboxFileDrag: SandboxFileDragPayload | null = null

export function setActiveSandboxFileDrag(file: SandboxFileDragPayload) {
  activeSandboxFileDrag = file
}

export function clearActiveSandboxFileDrag() {
  activeSandboxFileDrag = null
}

export function getActiveSandboxFileDrag() {
  return activeSandboxFileDrag
}

export function writeSandboxFileDragData(dataTransfer: DataTransfer, file: SandboxFileDragPayload) {
  dataTransfer.setData(SANDBOX_FILE_DRAG_TYPE, JSON.stringify(file))
  dataTransfer.setData('text/plain', file.filename)
}

export function hasSandboxFileDragData(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types || []).includes(SANDBOX_FILE_DRAG_TYPE)
}

export function readSandboxFileDragData(dataTransfer: DataTransfer): SandboxFileDragPayload | null {
  try {
    const raw = dataTransfer.getData(SANDBOX_FILE_DRAG_TYPE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SandboxFileDragPayload>
    const id = Number(parsed.id)
    const taskId = Number(parsed.task_id)
    const size = Number(parsed.size)
    if (!Number.isFinite(id) || !Number.isFinite(taskId) || !parsed.filename) return null
    return {
      id,
      task_id: taskId,
      filename: parsed.filename,
      mime_type: typeof parsed.mime_type === 'string' ? parsed.mime_type : null,
      size: Number.isFinite(size) ? size : 0,
      source: typeof parsed.source === 'string' ? parsed.source : 'sandbox',
    }
  } catch {
    return null
  }
}
