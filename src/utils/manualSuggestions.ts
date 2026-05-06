import type { AgentTaskEvent } from '../types'

const MANUAL_SUGGESTIONS_KEY = 'wensai.manual-export-suggestions'

export interface ManualSuggestion {
  id: string
  task_id: number
  event_id: number
  event_type: string
  content: string
  created_at: string
}

export function readManualSuggestions(): ManualSuggestion[] {
  try {
    const raw = localStorage.getItem(MANUAL_SUGGESTIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isManualSuggestion) : []
  } catch {
    return []
  }
}

export function hasManualSuggestion(taskId: number | string, eventId: number) {
  const id = buildManualSuggestionId(taskId, eventId)
  return readManualSuggestions().some((item) => item.id === id)
}

export function toggleManualSuggestion(taskId: number | string, event: AgentTaskEvent) {
  const id = buildManualSuggestionId(taskId, event.id)
  const current = readManualSuggestions()
  const exists = current.some((item) => item.id === id)
  const next = exists
    ? current.filter((item) => item.id !== id)
    : [
        ...current,
        {
          id,
          task_id: Number(taskId),
          event_id: event.id,
          event_type: event.type,
          content: event.content?.trim() || '',
          created_at: event.created_at,
        },
      ]

  localStorage.setItem(MANUAL_SUGGESTIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('wensai:manual-suggestions-changed'))
  return !exists
}

export function removeManualSuggestionsForTask(taskId: number | string) {
  const numericTaskId = Number(taskId)
  const next = readManualSuggestions().filter((item) => item.task_id !== numericTaskId)
  localStorage.setItem(MANUAL_SUGGESTIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('wensai:manual-suggestions-changed'))
}

function buildManualSuggestionId(taskId: number | string, eventId: number) {
  return `${taskId}:${eventId}`
}

function isManualSuggestion(value: unknown): value is ManualSuggestion {
  const item = value as ManualSuggestion
  return (
    typeof item?.id === 'string' &&
    typeof item.task_id === 'number' &&
    typeof item.event_id === 'number' &&
    typeof item.event_type === 'string' &&
    typeof item.content === 'string' &&
    typeof item.created_at === 'string'
  )
}
