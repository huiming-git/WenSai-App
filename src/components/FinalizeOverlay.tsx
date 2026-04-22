import { useState } from 'react'
import { useT } from '../context/LanguageContext'

interface FinalizeData {
  decision: 'accepted' | 'revision' | 'rejected'
  score: number
  comment: string
}

interface FinalizeOverlayProps {
  onSubmit: (data: FinalizeData) => Promise<void>
  onClose: () => void
}

const DECISIONS = [
  { value: 'accepted', colorBorder: 'border-green-400', colorBg: 'bg-green-50', colorRing: 'ring-green-500' },
  { value: 'revision', colorBorder: 'border-orange-400', colorBg: 'bg-orange-50', colorRing: 'ring-orange-500' },
  { value: 'rejected', colorBorder: 'border-red-400', colorBg: 'bg-red-50', colorRing: 'ring-red-500' },
]

export default function FinalizeOverlay({ onSubmit, onClose }: FinalizeOverlayProps) {
  const { t } = useT()
  const [decision, setDecision] = useState<FinalizeData['decision']>('accepted')
  const [score, setScore] = useState<number>(7)
  const [comment, setComment] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setLoading(true)
    try {
      await onSubmit({ decision, score, comment })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{t('finalize.title')}</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer bg-transparent border-none text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Decision */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">{t('finalize.description')}</label>
            <div className="space-y-2">
              {DECISIONS.map((opt) => (
                <label key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    decision === opt.value ? `${opt.colorBg} ${opt.colorBorder} ${opt.colorRing} ring-2` : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="decision" value={opt.value}
                    checked={decision === opt.value}
                    onChange={(e) => setDecision(e.target.value as FinalizeData['decision'])}
                    className="accent-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{t(`finalize.${opt.value === 'accepted' ? 'accept' : opt.value}`)}</p>
                    <p className="text-xs text-gray-500">{t(`finalize.${opt.value === 'accepted' ? 'accept' : opt.value}_desc`)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('review_form.score')}: <span className="text-2xl font-bold text-emerald-600">{score}</span> / 10
            </label>
            <input type="range" min="1" max="10" value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{t('review_form.score_poor')}</span>
              <span>{t('review_form.score_avg')}</span>
              <span>{t('review_form.score_excellent')}</span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('finalize.comment')} *</label>
            <textarea rows={4} required value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y text-sm"
              placeholder={t('finalize.comment_placeholder')} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={handleSubmit} disabled={loading || !comment.trim()}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-emerald-300 font-medium cursor-pointer border-none text-sm">
            {loading ? t('finalize.submitting') : t('finalize.confirm')}
          </button>
          <button onClick={onClose}
            className="px-6 py-2.5 bg-white text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer border border-gray-300 text-sm">
            {t('finalize.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
