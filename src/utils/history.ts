import { LOCAL_HISTORY_KEY } from '../data/wensai'
import type { Competition, HistoryItem, Paper } from '../types'

export function readLocalHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function writeLocalHistory(items: HistoryItem[]): void {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items.slice(0, 50)))
}

export function saveLocalCommand(command: { title: string; prompt: string; competition: string }): HistoryItem {
  const current = readLocalHistory()
  const nextItem: HistoryItem = {
    id: `local-${Date.now()}`,
    title: command.title,
    prompt: command.prompt,
    competition: command.competition,
    source: 'local',
    created_at: new Date().toISOString(),
  }
  writeLocalHistory([nextItem, ...current])
  return nextItem
}

export function paperToHistory(paper: Paper): HistoryItem {
  return {
    id: `paper-${paper.id}`,
    paperId: paper.id,
    title: paper.title,
    prompt: paper.abstract || '',
    competition: extractCompetition(paper.abstract),
    source: 'backend',
    created_at: paper.created_at,
    status: paper.status,
  }
}

export function mergeHistory(localItems: HistoryItem[], paperItems: HistoryItem[]): HistoryItem[] {
  const byKey = new Map<string, HistoryItem>()
  ;[...paperItems, ...localItems].forEach((item) => {
    const key = `${item.title}-${item.created_at?.slice(0, 16)}`
    if (!byKey.has(key)) byKey.set(key, item)
  })
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  )
}

export function buildPaperPayload({ title, prompt, competition }: { title: string; prompt: string; competition?: Competition }) {
  return {
    title,
    abstract: [
      `赛事类型：${competition?.name || '未选择'}`,
      `处理目标：${prompt || '生成修改建议'}`,
      '系统：问赛',
    ].join('\n'),
  }
}

function extractCompetition(text: string | null = ''): string {
  const line = (text || '').split('\n').find((item) => item.startsWith('赛事类型：'))
  return line ? line.replace('赛事类型：', '') : '未标注'
}
