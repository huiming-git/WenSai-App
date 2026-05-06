import { useState } from 'react'
import { SETTINGS_KEY } from '../data/wensai'
import { Panel } from '../components/WensaiUI'
import { useT } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useWorkbench } from '../context/WorkbenchContext'
import type { AppSettings } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  autoSaveLocal: true,
  autoSaveBackend: true,
  tauriFileChannel: true,
  largePptMode: true,
  exportFormat: 'word',
  theme: 'light',
  language: 'zh',
}

export default function SettingsPage() {
  const { lang, setLang } = useT()
  const { theme, setTheme } = useTheme()
  const { compactWorkbench } = useWorkbench()
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw
        ? {
            ...DEFAULT_SETTINGS,
            language: (localStorage.getItem('lang') as 'zh' | 'en') || 'zh',
            theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
            ...JSON.parse(raw),
          }
        : {
            ...DEFAULT_SETTINGS,
            language: (localStorage.getItem('lang') as 'zh' | 'en') || 'zh',
            theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
          }
    } catch {
      return { ...DEFAULT_SETTINGS, language: 'zh', theme: 'light' }
    }
  })
  const [saved, setSaved] = useState<boolean>(false)

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next: AppSettings = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    if (key === 'language') {
      setLang(value as 'zh' | 'en')
    }
    if (key === 'theme') {
      setTheme(value as 'light' | 'dark')
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className={['min-h-full bg-[#f5f7fb]', compactWorkbench ? 'p-3' : 'p-4 md:p-6'].join(' ')}>
      <div>
        <h1 className={['font-semibold text-slate-950', compactWorkbench ? 'text-xl' : 'text-2xl'].join(' ')}>设置页</h1>
      </div>

      {saved && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          设置已保存
        </div>
      )}

      <div className="mt-5">
        <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
          <div>
            <h2 className="font-semibold text-slate-950">外观模式</h2>
            <p className="mt-1 text-xs text-slate-500">浅色 / 深色</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {([
                ['light', '浅色模式'],
                ['dark', '深色模式'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateSetting('theme', value)}
                  className={[
                    'h-9 rounded-lg text-sm font-medium transition',
                    theme === value
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <h2 className="font-semibold text-slate-950">语言</h2>
            <p className="mt-1 text-xs text-slate-500">中文 / English</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {([
                ['zh', '中文'],
                ['en', 'English'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateSetting('language', value)}
                  className={[
                    'h-9 rounded-lg text-sm font-medium transition',
                    lang === value
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
