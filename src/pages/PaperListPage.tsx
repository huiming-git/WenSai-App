import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPapers } from '../api/papers'
import { EmptyState, Icon, Panel } from '../components/WensaiUI'
import { mergeHistory, paperToHistory, readLocalHistory } from '../utils/history'
import type { HistoryItem } from '../types'

export default function PaperListPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [filter, setFilter] = useState<string>('all')
  const navigate = useNavigate()

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await getPapers({ page: 1, page_size: 100 })
      const backendHistory: HistoryItem[] = res.data.items.map(paperToHistory)
      const localHistory: HistoryItem[] = readLocalHistory()
      setHistory(mergeHistory(localHistory, backendHistory))
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to load history', err)
      setHistory(readLocalHistory())
    } finally {
      setLoading(false)
    }
  }

  const visibleHistory = history.filter((item) => {
    if (filter === 'all') return true
    return item.source === filter
  })

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">历史命令</h1>
          <p className="mt-2 text-sm text-slate-500">
            本地历史和后端保存记录合并展示，当前后端记录 {total} 条。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Icon name="send" className="h-4 w-4" />
          新建任务
        </button>
      </div>

      <Panel className="mt-5 p-4">
        <div className="flex flex-wrap gap-2">
          {([
            ['all', '全部'],
            ['local', '本地保存'],
            ['backend', '后端保存'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={[
                'h-9 rounded-lg px-3 text-sm font-medium transition',
                filter === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-4">
        {loading ? (
          <div className="grid min-h-[300px] place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
          </div>
        ) : visibleHistory.length === 0 ? (
          <EmptyState title="暂无历史命令" description="从系统封面发送任务后，会同时写入本地历史和后端记录。" />
        ) : (
          <div className="grid gap-3">
            {visibleHistory.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => item.paperId ? navigate(`/papers/${item.paperId}`) : navigate('/')}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {item.source === 'backend' ? '后端保存' : '本地保存'}
                      </span>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        {item.competition}
                      </span>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h2>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{item.prompt}</p>
                  </div>
                  <div className="shrink-0 text-xs text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : '刚刚'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
