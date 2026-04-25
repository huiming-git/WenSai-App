import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPaper } from '../api/papers'
import { createAiReview, getReviews } from '../api/reviews'
import { EmptyState, Icon, Panel } from '../components/WensaiUI'
import { SUGGESTION_TEMPLATES, WORKFLOW_STEPS } from '../data/wensai'
import { buildSuggestionText, copySuggestion, exportPdf, exportWord } from '../utils/export'
import { clearActiveDraft, readActiveDraft } from '../utils/history'
import type { ActiveDraft, Paper, Review } from '../types'

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [draft, setDraft] = useState<ActiveDraft | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [notice, setNotice] = useState<string>('')
  const autoTriggeredRef = useRef<boolean>(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setNotice('')
      try {
        if (!id) {
          setPaper(null)
          setReviews([])
          setDraft(readActiveDraft())
          return
        }

        const [paperRes, reviewRes] = await Promise.all([getPaper(id), getReviews(id)])
        const activeDraft = readActiveDraft()
        setPaper(paperRes.data)
        setDraft(activeDraft?.paperId === paperRes.data.id ? activeDraft : null)
        setReviews(reviewRes.data)
      } catch (err) {
        console.error('Failed to load suggestions', err)
        setNotice('读取材料失败，请检查后端服务或返回历史重新选择。')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const sourceTitle = paper?.title || draft?.title || ''
  const sourcePrompt = paper?.abstract || buildDraftAbstract(draft)
  const competition = extractCompetitionName(sourcePrompt, draft?.competition)
  const fileLabel = draft?.fileName || (paper?.file_path ? '已上传材料' : '')
  const aiReviews = useMemo(() => reviews.filter((review) => review.source === 'ai'), [reviews])
  const manualReviews = useMemo(() => reviews.filter((review) => review.source === 'manual'), [reviews])
  const hasCompletedAi = aiReviews.some((review) => review.status === 'completed')
  const hasMaterial = Boolean(paper || draft)

  const exportText = buildSuggestionText({
    title: sourceTitle || '问赛材料',
    competition,
    prompt: sourcePrompt || '检查赛事材料并输出修改建议',
    suggestions: SUGGESTION_TEMPLATES,
    reviews,
  })

  const handleAiReview = useCallback(async () => {
    if (!paper) {
      setNotice('当前是本地草稿预览，后端保存成功后才能调用 AI 生成接口。')
      return
    }

    setAiLoading(true)
    setNotice('')
    try {
      const res = await createAiReview(paper.id)
      setReviews((current) => [res.data, ...current.filter((item) => item.id !== res.data.id)])

      if (res.data.status !== 'pending') {
        setNotice(res.data.status === 'completed' ? 'AI 修改建议已生成' : 'AI 生成失败，请稍后重试')
        return
      }

      const reviewId = res.data.id
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await delay(3000)
        const reviewsRes = await getReviews(paper.id)
        const updated = reviewsRes.data.find((review) => review.id === reviewId)
        setReviews(reviewsRes.data)
        if (updated && updated.status !== 'pending') {
          setNotice(updated.status === 'completed' ? 'AI 修改建议已生成' : 'AI 生成失败，请稍后重试')
          return
        }
      }

      setNotice('AI 生成时间较长，稍后刷新或从历史记录进入查看结果。')
    } catch (err) {
      setNotice((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'AI 生成失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }, [paper])

  useEffect(() => {
    if (!paper || !searchParams.has('autogen') || autoTriggeredRef.current || hasCompletedAi) return
    autoTriggeredRef.current = true
    handleAiReview()
  }, [handleAiReview, hasCompletedAi, paper, searchParams])

  const handleCopy = async () => {
    await copySuggestion(exportText)
    setNotice('已复制修改建议')
  }

  const handleNewMaterial = () => {
    clearActiveDraft()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center bg-[#f5f7fb]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">修改建议页</h1>
          <p className="mt-2 text-sm text-slate-500">
            {hasMaterial ? sourceTitle : '暂无当前材料，请从首页上传或从历史记录选择。'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportWord(exportText)}
            disabled={!hasMaterial}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            导出 Word
          </button>
          <button
            type="button"
            onClick={() => exportPdf(exportText)}
            disabled={!hasMaterial}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            导出 PDF
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasMaterial}
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            复制
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          {notice}
        </div>
      )}

      {!hasMaterial ? (
        <div className="mt-5">
          <EmptyState title="暂无材料" description="首页上传材料并发送后，这里会显示对应的修改建议。" />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              回到首页
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Panel className="overflow-hidden">
              <div className="border-b border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        {competition}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        支持超 100M PPT
                      </span>
                      {fileLabel && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {fileLabel}
                          {draft?.fileSize ? ` · ${formatFileSize(draft.fileSize)}` : ''}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-950">{sourceTitle}</h2>
                    <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                      {sourcePrompt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiReview}
                    disabled={aiLoading || !paper}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiLoading ? '生成中' : hasCompletedAi ? '重新生成 AI 建议' : '生成 AI 建议'}
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-950">修改建议结果</h3>
                {aiLoading && (
                  <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
                    正在生成 AI 修改建议，结果会在这里直接显示。
                  </div>
                )}

                {aiReviews.length ? (
                  <div className="mt-4 space-y-3">
                    {aiReviews.map((review) => (
                      <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-medium text-white">
                              AI Agent
                            </span>
                            <span className="text-sm font-semibold text-slate-900">{review.score}/10</span>
                            <span className="text-xs text-slate-500">{recommendationLabel(review.recommendation)}</span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(review.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.content}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {SUGGESTION_TEMPLATES.map((item) => (
                      <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-slate-950">{item.title}</h4>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            {item.level}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.content}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {manualReviews.length > 0 && (
              <Panel className="p-5">
                <h2 className="text-lg font-semibold text-slate-950">人工复核记录</h2>
                <div className="mt-4 space-y-3">
                  {manualReviews.map((review) => (
                    <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          人工复核 · {review.score}/10
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(review.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.content}</p>
                    </article>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          <aside className="space-y-5">
            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-slate-950">处理流程</h2>
              <div className="mt-4 space-y-4">
                {WORKFLOW_STEPS.map((step, index) => (
                  <div key={step.label} className="flex gap-3">
                    <span
                      className={[
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                        step.done ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{step.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{step.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-slate-950">下一步</h2>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleNewMaterial}
                  className="h-10 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  上传新材料
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  返回历史命令
                </button>
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  )
}

function buildDraftAbstract(draft: ActiveDraft | null): string {
  if (!draft) return ''
  return [`赛事类型：${draft.competition}`, `处理目标：${draft.prompt}`, '系统：问赛'].join('\n')
}

function extractCompetitionName(text: string | null | undefined = '', fallback = '中国国际大学生创新大赛'): string {
  const line = (text || '').split('\n').find((item) => item.startsWith('赛事类型：'))
  return line ? line.replace('赛事类型：', '') : fallback
}

function recommendationLabel(value: string): string {
  const labels: Record<string, string> = {
    accept: '建议通过',
    minor_revision: '小修',
    major_revision: '大修',
    reject: '建议重做',
  }
  return labels[value] || value
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
