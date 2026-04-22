import type { Review, SuggestionTemplate } from '../types'

interface BuildSuggestionTextParams {
  title: string
  competition: string
  prompt: string
  suggestions: SuggestionTemplate[]
  reviews: Review[]
}

export function buildSuggestionText({ title, competition, prompt, suggestions, reviews }: BuildSuggestionTextParams): string {
  const suggestionText = suggestions
    .map((item, index) => `${index + 1}. ${item.title}\n${item.content}`)
    .join('\n\n')
  const reviewText = reviews?.length
    ? reviews.map((item, index) => `评审 ${index + 1}\n评分：${item.score}/10\n建议：${item.recommendation}\n${item.content}`).join('\n\n')
    : '暂无后端评审结果，当前导出为问赛预置修改建议。'

  return [
    `问赛修改建议`,
    `材料：${title || '未命名材料'}`,
    `赛事：${competition || '未选择'}`,
    `命令：${prompt || '生成修改建议'}`,
    '',
    '一、结构化修改建议',
    suggestionText,
    '',
    '二、评审记录',
    reviewText,
  ].join('\n')
}

export async function copySuggestion(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export function exportWord(text: string, filename = '问赛修改建议'): void {
  const html = `
    <html>
      <head><meta charset="utf-8"><title>${escapeHtml(filename)}</title></head>
      <body style="font-family: Microsoft YaHei, Arial, sans-serif; line-height: 1.7;">
        <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(text)}</pre>
      </body>
    </html>
  `
  downloadBlob(html, `${filename}.doc`, 'application/msword;charset=utf-8')
}

export function exportPdf(text: string, filename = '问赛修改建议'): void {
  const printWindow = window.open('', '_blank', 'width=960,height=720')
  if (!printWindow) return
  printWindow.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(filename)}</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 32px; color: #0f172a; }
          pre { white-space: pre-wrap; line-height: 1.7; font-family: inherit; }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(text)}</pre>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
