import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPapers, getPaper, createPaper, deletePaper, finalizePaper, uploadPaperFile } from '../api/papers'
import { getReviews, createAiReview, createReview, deleteReview } from '../api/reviews'
import type { PaperCreate, PaperFinalize, ReviewCreate } from '../types'

// ---- Papers ----

export function usePapers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['papers', params],
    queryFn: () => getPapers(params).then((r) => r.data),
  })
}

export function usePaper(id: number | string | undefined) {
  return useQuery({
    queryKey: ['paper', id],
    queryFn: () => getPaper(id!).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreatePaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PaperCreate) => createPaper(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['papers'] }),
  })
}

export function useDeletePaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deletePaper(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['papers'] }),
  })
}

export function useFinalizePaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: PaperFinalize }) =>
      finalizePaper(id, data).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['paper', vars.id] })
      qc.invalidateQueries({ queryKey: ['papers'] })
    },
  })
}

export function useUploadPaperFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number | string; file: File }) =>
      uploadPaperFile(id, file).then((r) => r.data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['paper', vars.id] }),
  })
}

// ---- Reviews ----

export function useReviews(paperId: number | string | undefined) {
  return useQuery({
    queryKey: ['reviews', paperId],
    queryFn: () => getReviews(paperId!).then((r) => r.data),
    enabled: !!paperId,
  })
}

export function useCreateAiReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paperId: number | string) => createAiReview(paperId).then((r) => r.data),
    onSuccess: (_data, paperId) => qc.invalidateQueries({ queryKey: ['reviews', paperId] }),
  })
}

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paperId, data }: { paperId: number | string; data: ReviewCreate }) =>
      createReview(paperId, data).then((r) => r.data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['reviews', vars.paperId] }),
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  })
}
