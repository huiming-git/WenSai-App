import client from './client'
import type { Review, ReviewCreate, ReviewUpdate } from '../types'

export const getReviews = (paperId: number | string) => client.get<Review[]>(`/papers/${paperId}/reviews`)
export const createReview = (paperId: number | string, data: ReviewCreate) => client.post<Review>(`/papers/${paperId}/reviews`, data)
export const createAiReview = (paperId: number | string) => client.post<Review>(`/papers/${paperId}/ai-review`)
export const updateReview = (id: number | string, data: ReviewUpdate) => client.put<Review>(`/reviews/${id}`, data)
export const deleteReview = (id: number | string) => client.delete(`/reviews/${id}`)
