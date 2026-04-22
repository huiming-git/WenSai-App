import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPaper, getPapers, deletePaper, finalizePaper, downloadPaperFile } from '../api/papers'
import { getReviews, createAiReview, deleteReview } from '../api/reviews'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LanguageContext'
import FinalizeOverlay from '../components/FinalizeOverlay'
import { Icon, Panel } from '../components/WensaiUI'
import { SUGGESTION_TEMPLATES, WORKFLOW_STEPS } from '../data/wensai'
import { buildSuggestionText, copySuggestion, exportPdf, exportWord } from '../utils/export'
import type { Paper, Review, PaperFinalize } from '../types'

function LegacyPaperDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useT()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiTipIndex, setAiTipIndex] = useState<number>(0)
  const [aiElapsed, setAiElapsed] = useState<number>(0)
  const [showFinalize, setShowFinalize] = useState<boolean>(false)

  const loadingTips = useMemo(() => [
    t('ai.tip_1'), t('ai.tip_2'), t('ai.tip_3'),
    t('ai.tip_4'), t('ai.tip_5'), t('ai.tip_6'),
  ], [t])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [paperRes, reviewsRes] = await Promise.all([getPaper(id!), getReviews(id!)])
        setPaper(paperRes.data)
        setReviews(reviewsRes.data)
      } catch (err) {
        console.error('Failed to load paper', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  useEffect(() => {
    if (!aiLoading) return
    setAiTipIndex(0)
    setAiElapsed(0)
    const tipTimer = setInterval(() => setAiTipIndex((i) => (i + 1) % loadingTips.length), 3000)
    const elapsedTimer = setInterval(() => setAiElapsed((s) => s + 1), 1000)
    return () => { clearInterval(tipTimer); clearInterval(elapsedTimer) }
  }, [aiLoading, loadingTips.length])

  const handleAiReview = async () => {
    setAiLoading(true)
    try {
      const res = await createAiReview(id!)
      setReviews([res.data, ...reviews])
      const paperRes = await getPaper(id!)
      setPaper(paperRes.data)
      // Poll until the pending review completes
      const reviewId = res.data.id
      const poll = setInterval(async () => {
        try {
          const reviewsRes = await getReviews(id!)
          const updated = reviewsRes.data.find((r: Review) => r.id === reviewId)
          if (updated && updated.status !== 'pending') {
            clearInterval(poll)
            setReviews(reviewsRes.data)
            setAiLoading(false)
          }
        } catch {
          clearInterval(poll)
          setAiLoading(false)
        }
      }, 3000)
    } catch (err) {
      alert((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'AI review failed')
      setAiLoading(false)
    }
  }

  const handleFinalize = async (data: PaperFinalize) => {
    try {
      const res = await finalizePaper(id!, data)
      setPaper(res.data)
      setShowFinalize(false)
    } catch (err) {
      alert((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Finalize failed')
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('paper.delete_confirm'))) return
    try { await deletePaper(id!); navigate('/papers') }
    catch (err) { alert((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Delete failed') }
  }

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm(t('paper.delete_review_confirm'))) return
    try { await deleteReview(reviewId); setReviews(reviews.filter((r) => r.id !== reviewId)) }
    catch (err) { alert((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Delete failed') }
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800', under_review: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-green-100 text-green-800', accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800', revision: 'bg-orange-100 text-orange-800',
  }
  const recommendColor: Record<string, string> = {
    accept: 'text-green-700', minor_revision: 'text-blue-700',
    major_revision: 'text-orange-700', reject: 'text-red-700',
  }
  const isFinalized = ['accepted', 'rejected'].includes(paper?.status ?? '')

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
  if (!paper) return <div className="text-center py-20 text-gray-500">{t('paper.not_found')}</div>

  const isOwner = user?.id === paper.author_id
  const hasAiReview = reviews.some((r) => r.source === 'ai')
  const aiReviews = reviews.filter((r) => r.source === 'ai')
  const manualReviews = reviews.filter((r) => r.source === 'manual')

  return (
    <div>
      {/* Finalize Overlay */}
      {showFinalize && (
        <FinalizeOverlay
          onSubmit={handleFinalize}
          onClose={() => setShowFinalize(false)}
        />
      )}

      {/* Paper Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{paper.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {paper.author?.username || 'Unknown'} &middot; {new Date(paper.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor[paper.status]}`}>{t(`status.${paper.status}`)}</span>
        </div>

        {paper.abstract && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">{t('paper.requirements')}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{paper.abstract}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          {paper.file_path && (
            <button onClick={() => downloadPaperFile(paper.id, paper.title)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer border-none">
              {t('paper.download')}
            </button>
          )}
          {!hasAiReview && !aiLoading && (
            <button onClick={handleAiReview}
              className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer border-none font-medium">
              {t('paper.ai_review_btn')}
            </button>
          )}
          <Link to={`/papers/${paper.id}/review`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 no-underline">
            {t('paper.manual_review_btn')}
          </Link>
          {isOwner && (
            <button onClick={handleDelete}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200 cursor-pointer">
              {t('paper.delete_btn')}
            </button>
          )}
          {!isFinalized && reviews.length > 0 && (
            <button onClick={() => setShowFinalize(true)}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer border-none font-medium">
              ✅ {t('finalize.title')}
            </button>
          )}
        </div>
      </div>

      {/* Finalized Banner */}
      {isFinalized && (
        <div className={`mb-6 p-5 rounded-lg border-2 ${
          paper.status === 'accepted' ? 'bg-green-50 border-green-300' :
          'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-lg font-bold ${paper.status === 'accepted' ? 'text-green-800' : 'text-red-800'}`}>
              ✅ {t('finalize.already')} — {paper.status === 'accepted' ? t('finalize.status_accepted') : t('finalize.status_rejected')}
            </span>
            {paper.final_score && (
              <span className="text-2xl font-bold text-gray-800">{paper.final_score}/10</span>
            )}
          </div>
          {paper.final_comment && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-2">{paper.final_comment}</p>
          )}
        </div>
      )}

      {/* AI Loading */}
      {aiLoading && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-300 mb-6 overflow-hidden">
          <div className="h-1 bg-purple-100"><div className="h-1 bg-purple-500 animate-pulse" style={{ width: '100%' }}></div></div>
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-xl">🤖</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-purple-800">{t('ai.loading_title')}</p>
              <p className="text-sm text-purple-600 mt-1">{loadingTips[aiTipIndex]}</p>
              <p className="text-xs text-gray-400 mt-2">{t('ai.elapsed')}: {aiElapsed}s — {t('ai.loading_time')}</p>
            </div>
            <div className="w-full max-w-lg mt-2 space-y-2">
              <div className="h-3 bg-purple-100 rounded animate-pulse"></div>
              <div className="h-3 bg-purple-100 rounded animate-pulse w-5/6"></div>
              <div className="h-3 bg-purple-100 rounded animate-pulse w-4/6"></div>
            </div>
          </div>
        </div>
      )}

      {/* AI Reviews */}
      {aiReviews.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-purple-200 mb-6">
          <div className="p-6 border-b border-purple-100 bg-purple-50 rounded-t-lg">
            <h2 className="text-lg font-semibold text-purple-800">{t('review.ai_title')}</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {aiReviews.map((review) => (
              <div key={review.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">{t('review.ai_agent')}</span>
                    <span className="text-2xl font-bold text-gray-800">{review.score}/10</span>
                    <span className={`text-sm font-medium ${recommendColor[review.recommendation] || 'text-gray-600'}`}>
                      {t(`rec.${review.recommendation}`) || review.recommendation}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none">{t('review.delete')}</button>
                  </div>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{review.content}</div>
                {review.llm_log && (() => {
                  try {
                    const log = JSON.parse(review.llm_log)
                    const mode: string | undefined = log.mode
                    return (
                      <div className="mt-3 pt-3 border-t border-purple-100 flex items-center gap-2 text-xs text-gray-400">
                        <span>{mode?.includes('fallback') ? '📄' : mode?.includes('responses') ? '📎' : '💬'}</span>
                        <span>
                          {mode === 'responses_input_file' ? t('review.mode_direct') :
                           mode === 'chat_completions_fallback' ? t('review.mode_extract') :
                           t('review.mode_text_only')}
                        </span>
                        <span>· {log.model}</span>
                      </div>
                    )
                  } catch { return null }
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Reviews */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{t('review.manual_title')} ({manualReviews.length})</h2>
        </div>
        {manualReviews.length === 0 ? (
          <div className="p-6 text-center text-gray-500">{t('review.no_manual')}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {manualReviews.map((review) => (
              <div key={review.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{review.reviewer?.username || 'Reviewer'}</span>
                    <span className="text-2xl font-bold text-gray-800">{review.score}/10</span>
                    <span className={`text-sm font-medium ${recommendColor[review.recommendation] || 'text-gray-600'}`}>
                      {t(`rec.${review.recommendation}`) || review.recommendation}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    {user?.id === review.reviewer_id && (
                      <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none">{t('review.delete')}</button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

LegacyPaperDetailPage.displayName = 'LegacyPaperDetailPage'

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [notice, setNotice] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (id) {
          const [paperRes, reviewRes] = await Promise.all([getPaper(id), getReviews(id)])
          setPaper(paperRes.data)
          setReviews(reviewRes.data)
        } else {
          const res = await getPapers({ page: 1, page_size: 1 })
          const latest: Paper | null = res.data.items[0] || null
          setPaper(latest)
          if (latest) {
            const reviewRes = await getReviews(latest.id)
            setReviews(reviewRes.data)
          }
        }
      } catch (err) {
        console.error('Failed to load suggestions', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const competition = extractCompetitionName(paper?.abstract)
  const exportText = buildSuggestionText({
    title: paper?.title || '问赛示例材料',
    competition,
    prompt: paper?.abstract || '检查赛事材料并输出修改建议',
    suggestions: SUGGESTION_TEMPLATES,
    reviews,
  })

  const handleAiReview = async () => {
    if (!paper) return
    setAiLoading(true)
    try {
      const res = await createAiReview(paper.id)
      setReviews([res.data, ...reviews])
      // Poll until the pending review completes
      const reviewId = res.data.id
      const poll = setInterval(async () => {
        try {
          const reviewsRes = await getReviews(paper.id)
          const updated = reviewsRes.data.find((r: Review) => r.id === reviewId)
          if (updated && updated.status !== 'pending') {
            clearInterval(poll)
            setReviews(reviewsRes.data)
            setAiLoading(false)
            setNotice(updated.status === 'completed' ? 'AI 修改建议已生成' : 'AI 生成失败，请稍后重试')
          }
        } catch {
          clearInterval(poll)
          setAiLoading(false)
        }
      }, 3000)
    } catch (err) {
      setNotice((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'AI 生成失败，请稍后重试')
      setAiLoading(false)
    }
  }

  const handleCopy = async () => {
    await copySuggestion(exportText)
    setNotice('已复制修改建议')
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
            {paper ? paper.title : '暂无材料，当前展示问赛示例建议。'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportWord(exportText)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            导出 Word
          </button>
          <button
            type="button"
            onClick={() => exportPdf(exportText)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            导出 PDF
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">
                    {paper?.title || '问赛材料修改示例'}
                  </h2>
                  <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                    {paper?.abstract || '上传 PPT 或从首页发送命令后，这里会显示对应材料的修改建议。'}
                  </p>
                </div>
                {paper && (
                  <button
                    type="button"
                    onClick={handleAiReview}
                    disabled={aiLoading}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
                  >
                    {aiLoading ? '生成中' : '生成 AI 建议'}
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {SUGGESTION_TEMPLATES.map((item) => (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {item.level}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.content}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">AI / 人工评审结果</h2>
            <div className="mt-4 space-y-3">
              {reviews.length ? reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-medium text-white">
                        {review.source === 'ai' ? 'AI Agent' : '人工复核'}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{review.score}/10</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(review.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.content}</p>
                </article>
              )) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  暂无后端评审结果，可先导出预置修改建议，或上传材料后生成 AI 建议。
                </p>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">导出支持</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['Word', 'PDF', '复制'].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </Panel>

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
                onClick={() => navigate('/upload')}
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
    </div>
  )
}

function extractCompetitionName(text: string | null | undefined = ''): string {
  const line = (text || '').split('\n').find((item) => item.startsWith('赛事类型：'))
  return line ? line.replace('赛事类型：', '') : '中国国际大学生创新大赛'
}
