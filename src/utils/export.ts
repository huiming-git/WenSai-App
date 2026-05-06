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
