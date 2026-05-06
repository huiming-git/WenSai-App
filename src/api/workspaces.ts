import client from './client'
import type { WorkspaceMember, WorkspaceSummary, WorkspaceTaskSummary } from '../types'

interface CreateWorkspaceRequest {
  name: string
}

interface JoinWorkspaceRequest {
  invite_code: string
}

interface SwitchWorkspaceResponse {
  workspace_id: number
  active_workspace_id: number
}

export const listWorkspaces = () => client.get<WorkspaceSummary[]>('/workspaces')
export const createWorkspace = (data: CreateWorkspaceRequest) => client.post<WorkspaceSummary>('/workspaces', data)
export const joinWorkspace = (data: JoinWorkspaceRequest) => client.post<WorkspaceSummary>('/workspaces/join', data)
export const switchWorkspace = (workspaceId: number | string) =>
  client.post<SwitchWorkspaceResponse>(`/workspaces/${workspaceId}/switch`)
export const deleteWorkspace = (workspaceId: number | string) => client.delete(`/workspaces/${workspaceId}`)
export const listWorkspaceMembers = (workspaceId: number | string) =>
  client.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
export const removeWorkspaceMember = (workspaceId: number | string, userId: number | string) =>
  client.delete(`/workspaces/${workspaceId}/members/${userId}`)
export const listWorkspaceTasks = (workspaceId: number | string) =>
  client.get<WorkspaceTaskSummary[]>(`/workspaces/${workspaceId}/tasks`)
