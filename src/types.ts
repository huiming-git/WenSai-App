// ---- API Response Types ----

export interface WorkspaceSummary {
  id: number
  owner_id: number
  name: string
  invite_code: string
  role: string
  member_count: number
  is_active: boolean
  created_at: string
  root_path?: string | null
}

export interface WorkspaceMember {
  id: number
  user_id: number
  username: string
  role: string
  created_at: string
}

export interface WorkspaceTaskSummary {
  id: number
  owner_id: number
  owner_username: string
  workspace_id: number | null
  title: string | null
  prompt: string
  status: string
  agent_type: string
  input?: Record<string, unknown> | null
  created_at: string
}

export interface SandboxRecord extends WorkspaceTaskSummary {
  lastMessage: string
}

export interface User {
  id: number
  username: string
  created_at: string
  credits?: number
  active_workspace_id?: number | null
  active_workspace?: Pick<WorkspaceSummary, 'id' | 'name' | 'invite_code'> | null
}

export interface Token {
  access_token: string
  token_type: string
}

export interface CreditBalanceResponse {
  credits: number
}

export interface RedeemCodeResponse {
  credits: number
  added: number
  code: string
  message: string
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

// ---- App Types ----

export interface AppSettings {
  autoSaveLocal: boolean
  autoSaveBackend: boolean
  tauriFileChannel: boolean
  largePptMode: boolean
  exportFormat: 'word' | 'pdf' | 'copy'
  theme: 'light' | 'dark'
  language: 'zh' | 'en'
}

export type AgentTaskStatus = 'pending' | 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelling' | 'cancelled'

export interface AgentTask {
  id: number
  task_id?: number
  user_id: number
  workspace_id: number | null
  agent_type: string
  model: string
  prompt: string
  input: Record<string, unknown> | null
  status: AgentTaskStatus
  result: Record<string, unknown> | string | null
  error: string | null
  created_at: string
  queued_at: string | null
  started_at: string | null
  completed_at: string | null
}

export interface AgentTaskEvent {
  id: number
  task_id: number
  type: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
  seq?: number
}

export interface TaskEventPage {
  items: AgentTaskEvent[]
  next_cursor: string | null
}

export interface Approval {
  id: number
  approval_id?: number
  task_id: number
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  action_type: string
  risk_level: string
  description: string
  payload: Record<string, unknown> | null
  response: Record<string, unknown> | null
  created_at: string
  resolved_at: string | null
}

export interface AgentFile {
  id: number
  task_id: number
  filename: string
  mime_type: string | null
  size: number
  checksum?: string | null
  source: string
  created_at: string
}

export interface WorkspaceFile {
  id: number
  user_id: number | null
  workspace_id: number | null
  task_id: number
  filename: string
  mime_type: string | null
  size: number
  checksum?: string | null
  source: string
  created_at: string
}

export interface FilePreview {
  id: number
  filename: string
  mime_type: string | null
  size: number
  mode: 'text' | 'image' | 'gallery' | 'download'
  content: string | null
  page_count: number
  page_image_urls: string[]
  download_url: string | null
  message: string | null
}
