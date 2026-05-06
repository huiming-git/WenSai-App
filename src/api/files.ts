import client from './client'
import type { FilePreview, WorkspaceFile } from '../types'

export const listWorkspaceFiles = (workspaceId: number | string) =>
  client.get<WorkspaceFile[]>(`/workspaces/${workspaceId}/files`)

export const getFilePreview = (fileId: number | string) =>
  client.get<FilePreview>(`/files/${fileId}/preview`)

export const downloadFileBlob = (fileId: number | string) =>
  client.get<Blob>(`/files/${fileId}`, { responseType: 'blob' })
