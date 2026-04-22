import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createReview } from '../api/reviews'
import { Panel } from '../components/WensaiUI'

interface ReviewFormState {
  score: number | string
  content: string
  recommendation: string
}

export default function ReviewFormPage() {
  const { paperId } = useParams<{ paperId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<ReviewFormState>({ score: 5, content: '', recommendation: 'minor_revision' })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createReview(paperId!, { ...form, score: parseInt(String(form.score)) })
      navigate(`/papers/${paperId}`)
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-950">人工复核修改建议</h1>
        <p className="mt-2 text-sm text-slate-500">给 AI 建议补充人工判断，保存后回到修改建议页。</p>

      <Panel className="mt-5 p-5">
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              评分：<span className="text-2xl font-semibold text-cyan-600">{form.score}</span> / 10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={form.score}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, score: e.target.value })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-cyan-500"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>1 差</span>
              <span>5 一般</span>
              <span>10 优秀</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">推荐意见</label>
            <select
              value={form.recommendation}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, recommendation: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="accept">建议通过</option>
              <option value="minor_revision">小修后通过</option>
              <option value="major_revision">大修后复核</option>
              <option value="reject">建议退回</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">复核意见</label>
            <textarea
              rows={8}
              required
              value={form.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, content: e.target.value })}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="请补充优势、问题和可直接修改的建议..."
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? '提交中' : '提交复核'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/papers/${paperId}`)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </form>
      </Panel>
      </div>
    </div>
  )
}
