import client from './client'
import type { Paper, PaperCreate, PaperUpdate, PaperFinalize, PaperListResponse } from '../types'

export const getPapers = (params?: Record<string, unknown>) => client.get<PaperListResponse>('/papers', { params })
export const getPaper = (id: number | string) => client.get<Paper>(`/papers/${id}`)
export const createPaper = (data: PaperCreate) => client.post<Paper>('/papers', data)
export const updatePaper = (id: number | string, data: PaperUpdate) => client.put<Paper>(`/papers/${id}`, data)
export const deletePaper = (id: number | string) => client.delete(`/papers/${id}`)
export const finalizePaper = (id: number | string, data: PaperFinalize) => client.post<Paper>(`/papers/${id}/finalize`, data)

export const uploadPaperFile = (id: number | string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post<Paper>(`/papers/${id}/upload`, formData)
}

export const downloadPaperFile = async (id: number | string, filename?: string) => {
  const res = await client.get(`/papers/${id}/file`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'paper'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
