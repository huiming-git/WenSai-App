import client, { API_BASE_URL } from './client'
import type { AgentFile, AgentTask, Approval, TaskEventPage } from '../types'

interface CreateTaskRequest {
  workspace_id?: number | null
  agent_type: string
  model: string
  prompt: string
  input?: Record<string, unknown>
  dispatch?: boolean
}

interface CreateTaskResponse {
  task_id: number
  status: string
}

export const createTask = (data: CreateTaskRequest) => client.post<CreateTaskResponse>('/tasks', data)
export const startTask = (taskId: number | string) => client.post<CreateTaskResponse>(`/tasks/${taskId}/start`)
export const uploadTaskFile = (taskId: number | string, file: File, relativePath?: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('relative_path', relativePath || file.name)
  return client.post<AgentFile>(`/tasks/${taskId}/files`, form)
}
export const createTaskFile = (
  taskId: number | string,
  data: { filename: string; kind: 'file' | 'folder'; content?: string },
) => client.post<AgentFile>(`/tasks/${taskId}/files/create`, data)
export const getTask = (taskId: number | string) => client.get<AgentTask>(`/tasks/${taskId}`)
export const getTaskEvents = (taskId: number | string, params?: Record<string, unknown>) =>
  client.get<TaskEventPage>(`/tasks/${taskId}/events`, { params })
export const getTaskApprovals = (taskId: number | string) => client.get<Approval[]>(`/tasks/${taskId}/approvals`)
export const approveTaskApproval = (taskId: number | string, approvalId: number | string) =>
  client.post<Approval>(`/tasks/${taskId}/approvals/${approvalId}/approve`, { response: { ok: true } })
export const rejectTaskApproval = (taskId: number | string, approvalId: number | string) =>
  client.post<Approval>(`/tasks/${taskId}/approvals/${approvalId}/reject`, { response: { ok: false } })
export const cancelTask = (taskId: number | string) => client.post(`/tasks/${taskId}/cancel`)
export const deleteTask = (taskId: number | string) => client.delete(`/tasks/${taskId}`)
export const getTaskFiles = (taskId: number | string) => client.get<AgentFile[]>(`/tasks/${taskId}/files`)
export const deleteTaskFile = (fileId: number | string) => client.delete(`/files/${fileId}`)

export function taskEventsWsUrl(taskId: number | string): string {
  const token = localStorage.getItem('token') || ''
  const base = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '')
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  return `${base}/ws/tasks/${taskId}/events?token=${encodeURIComponent(token)}`
}
