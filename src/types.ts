// ---- API Response Types ----

export interface User {
  id: number
  username: string
  created_at: string
}

export interface Paper {
  id: number
  title: string
  abstract: string | null
  file_path: string | null
  status: 'pending' | 'under_review' | 'accepted' | 'revision' | 'rejected'
  author_id: number
  author?: User
  final_score: number | null
  final_comment: string | null
  created_at: string
  updated_at: string
}

export interface PaperListResponse {
  items: Paper[]
  total: number
  page: number
  page_size: number
}

export interface Review {
  id: number
  paper_id: number
  reviewer_id: number | null
  reviewer: User | null
  source: 'ai' | 'manual'
  status: 'pending' | 'completed' | 'failed'
  score: number
  content: string
  recommendation: 'accept' | 'minor_revision' | 'major_revision' | 'reject'
  llm_log: string | null
  created_at: string
  updated_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

// ---- Request Types ----

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  invite_code: string
}

export interface PaperCreate {
  title: string
  abstract?: string
}

export interface PaperUpdate {
  title?: string
  abstract?: string
}

export interface PaperFinalize {
  decision: 'accepted' | 'revision' | 'rejected'
  score: number
  comment: string
}

export interface ReviewCreate {
  score: number
  content: string
  recommendation: string
}

export interface ReviewUpdate {
  score?: number
  content?: string
  recommendation?: string
}

// ---- App Types ----

export interface Competition {
  id: string
  name: string
  shortName: string
  tone: string
  focus: string
}

export interface SuggestionTemplate {
  title: string
  level: string
  content: string
}

export interface WorkflowStep {
  label: string
  value: string
  done: boolean
}

export interface PricingPlan {
  name: string
  price: string
  note: string
  description: string
  features: string[]
}

export interface HistoryItem {
  id: string
  paperId?: number
  title: string
  prompt: string
  competition: string
  source: 'local' | 'backend'
  created_at: string
  status?: string
}

export interface AppSettings {
  autoSaveLocal: boolean
  autoSaveBackend: boolean
  tauriFileChannel: boolean
  largePptMode: boolean
  exportFormat: 'word' | 'pdf' | 'copy'
}
