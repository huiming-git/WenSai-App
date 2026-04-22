import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPaper, uploadPaperFile } from '../api/papers'
import { COMPETITIONS, DEFAULT_COMMAND } from '../data/wensai'
import { Icon, Panel } from '../components/WensaiUI'
import { buildPaperPayload, saveLocalCommand } from '../utils/history'

const FILE_TYPES: Record<string, string> = {
  pdf: 'extract',
  pptx: 'extract',
  ppt: 'extract',
  txt: 'extract',
  md: 'extract',
  tex: 'extract',
  doc: 'direct',
  docx: 'direct',
}

interface UploadFormState {
  title: string
  prompt: string
  competitionId: string
}

export default function PaperUploadPage() {
  const [form, setForm] = useState<UploadFormState>({
    title: '',
    prompt: DEFAULT_COMMAND,
    competitionId: COMPETITIONS[0].id,
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const navigate = useNavigate()

  const getFileExt = (): string | null => {
    if (!file) return null
    return file.name.split('.').pop()?.toLowerCase() || null
  }

  const getFileMethod = (): string | null => {
    const ext = getFileExt()
    if (!ext) return null
    return FILE_TYPES[ext] || 'unknown'
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const competition = COMPETITIONS.find((item) => item.id === form.competitionId) || COMPETITIONS[0]
    const title = form.title || file?.name || '问赛材料'
    saveLocalCommand({ title, prompt: form.prompt, competition: competition.name })
    try {
      const res = await createPaper(buildPaperPayload({ title, prompt: form.prompt, competition }))
      const paperId = res.data.id
      if (file) await uploadPaperFile(paperId, file)
      navigate(`/papers/${paperId}`)
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || '上传失败，请检查后端服务或文件权限')
    } finally {
      setLoading(false)
    }
  }

  const method = getFileMethod()
  const fileSize = file ? formatFileSize(file.size) : null

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">上传页</h1>
          <p className="mt-2 text-sm text-slate-500">
            支持 PPT、PPTX、PDF、DOCX 等材料，支持超过 100M 的 PPT，桌面端预留 Tauri 本地文件通道。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          查看历史
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-5">
          {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">材料名称</label>
            <input
              type="text"
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="例如：国赛路演PPT_v6"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">赛事类型</label>
            <div className="grid gap-3 md:grid-cols-3">
              {COMPETITIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setForm({ ...form, competitionId: item.id })}
                  className={[
                    'rounded-lg border p-4 text-left transition',
                    form.competitionId === item.id
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <p className="font-semibold">{item.shortName}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.focus}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">修改目标</label>
            <textarea
              rows={5}
              value={form.prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, prompt: e.target.value })}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="请输入你希望问赛检查的重点，例如：商业模式、路演逻辑、答辩问题..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">PPT / 材料文件</label>
            <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300 bg-cyan-50/60 px-4 py-8 text-center transition hover:bg-cyan-50">
              <Icon name="upload" className="h-8 w-8 text-cyan-600" />
              <span className="mt-3 text-sm font-semibold text-slate-900">选择或拖入文件</span>
              <span className="mt-2 text-xs leading-5 text-slate-500">
                支持超 100M PPT，浏览器上传会受网络和后端部署环境影响
              </span>
              <input
                type="file"
                accept=".pdf,.pptx,.ppt,.doc,.docx,.txt,.md,.tex"
                className="hidden"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            {file && method && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                <span>
                  <strong className="text-slate-900">{file.name}</strong>
                  <span className="ml-2 text-slate-500">{fileSize}</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {method === 'direct' ? '直接传文件' : method === 'extract' ? '可提取文本' : '仅作附件'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? '上传中' : '提交材料'}
              <Icon name="send" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="h-10 rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
          </div>
          </form>
        </Panel>

        <aside className="space-y-4">
          <Panel className="p-5">
            <h2 className="text-lg font-semibold text-slate-950">WorkBuddy 级上传体验</h2>
            <div className="mt-4 space-y-3">
              {[
                ['超 100M', '前端不设硬限制，保留大文件路径。'],
                ['Tauri 预留', '桌面端可改为本地文件句柄传递。'],
                ['后端保存', '使用现有 /api/papers 与 /upload 接口。'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
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
