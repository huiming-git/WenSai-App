import { useState } from 'react'
import { SETTINGS_KEY } from '../data/wensai'
import { Icon, LogoMark, Panel } from '../components/WensaiUI'
import type { AppSettings } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  autoSaveLocal: true,
  autoSaveBackend: true,
  tauriFileChannel: true,
  largePptMode: true,
  exportFormat: 'word',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [saved, setSaved] = useState<boolean>(false)

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next: AppSettings = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">设置页</h1>
          <p className="mt-2 text-sm text-slate-500">
            当前设置保存在本地，接口保持不变；Tauri 桌面能力已预留开关位。
          </p>
        </div>
        <LogoMark className="h-14 w-14" />
      </div>

      {saved && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          设置已保存
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-slate-950">保存策略</h2>
          <div className="mt-4 divide-y divide-slate-100">
            <ToggleRow
              title="本地保存历史命令"
              description="写入 localStorage，离线也能看到最近任务。"
              checked={settings.autoSaveLocal}
              onChange={(value) => updateSetting('autoSaveLocal', value)}
            />
            <ToggleRow
              title="后端保存历史命令"
              description="继续复用 /api/papers，不新增接口。"
              checked={settings.autoSaveBackend}
              onChange={(value) => updateSetting('autoSaveBackend', value)}
            />
            <ToggleRow
              title="超 100M PPT 模式"
              description="支持超过 100M 的 PPT，大文件交给后端和桌面端能力处理。"
              checked={settings.largePptMode}
              onChange={(value) => updateSetting('largePptMode', value)}
            />
            <ToggleRow
              title="Tauri 本地文件通道"
              description="Web 端保持普通上传，桌面端可替换为本地文件句柄。"
              checked={settings.tauriFileChannel}
              onChange={(value) => updateSetting('tauriFileChannel', value)}
            />
          </div>
        </Panel>

        <aside className="space-y-5">
          <Panel className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
                <Icon name="settings" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">导出默认格式</h2>
                <p className="text-xs text-slate-500">Word / PDF / 复制均已支持</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([
                ['word', 'Word'],
                ['pdf', 'PDF'],
                ['copy', '复制'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateSetting('exportFormat', value)}
                  className={[
                    'h-9 rounded-lg text-sm font-medium transition',
                    settings.exportFormat === value
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-slate-950">桌面端预留</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              当前项目仍是 React + Vite Web 前端，结构可直接接入 Tauri。桌面端可补充系统文件选择器、托盘任务和本地缓存。
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

interface ToggleRowProps {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full transition',
          checked ? 'bg-cyan-500' : 'bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition',
            checked ? 'left-6' : 'left-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
