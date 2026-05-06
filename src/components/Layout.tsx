import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listWorkspaces, switchWorkspace } from '../api/workspaces'
import { useAuth } from '../context/AuthContext'
import { WorkbenchProvider } from '../context/WorkbenchContext'
import { APP_NAME } from '../data/wensai'
import { isDesktopShell } from '../platform'
import type { AgentFile, SandboxRecord, WorkspaceSummary, WorkspaceTaskSummary } from '../types'
import { Icon } from './WensaiUI'
import WorkspaceExplorer from './WorkspaceExplorer'
import DashboardPage from '../pages/DashboardPage'
import SandboxHistoryPage from '../pages/SandboxHistoryPage'
import SuggestionExportPage from '../pages/SuggestionExportPage'
import PricingPage from '../pages/PricingPage'
import SettingsPage from '../pages/SettingsPage'
import SandboxWorkspacePage from '../pages/SandboxWorkspacePage'
import SandboxManagePage from '../pages/SandboxManagePage'
import TeamSpacePage from '../pages/TeamSpacePage'
import WorkspacePreviewPage from '../pages/WorkspacePreviewPage'

const SIDEBAR_COLLAPSED_KEY = 'wensai.sidebar.collapsed'
const ACCOUNT_SIDEBAR_COLLAPSED_KEY = 'wensai.account-sidebar.collapsed'
const ACCOUNT_SECTION_OPEN_KEY = 'wensai.account-section.open'
const SIDEBAR_WIDTH_KEY = 'wensai.sidebar.width'
const ACCOUNT_SIDEBAR_WIDTH_KEY = 'wensai.account-sidebar.width'
const WORKBENCH_PANEL_WIDTH_KEY = 'wensai.workbench-panel.width'
const USER_AVATAR_PREFIX = 'wensai.user-avatar.'
const WORKBENCH_NAV_ORDER_KEY = 'wensai.workbench-nav.order'
const ACCOUNT_NAV_ORDER_KEY = 'wensai.account-nav.order'
const CURRENT_SANDBOX_KEY_PREFIX = 'wensai.current-sandbox.'
const LEFT_SIDEBAR_DEFAULT = 320
const LEFT_SIDEBAR_MIN = 260
const LEFT_SIDEBAR_MAX = 520
const RIGHT_SIDEBAR_DEFAULT = 280
const RIGHT_SIDEBAR_MIN = 220
const RIGHT_SIDEBAR_MAX = 420
const WORKBENCH_PANEL_DEFAULT = 520
const WORKBENCH_PANEL_MIN = 360
const WORKBENCH_PANEL_MAX = 820

const NAV_ITEMS = [
  { id: 'home', to: '/', icon: 'home', label: '首页', end: true },
  { id: 'sandboxes', to: '/sandboxes', icon: 'sandbox', label: '对话' },
  { id: 'history', to: '/history', icon: 'history', label: '历史' },
  { id: 'suggestions', to: '/suggestions', icon: 'suggest', label: '建议' },
] as const

const ACCOUNT_NAV_ITEMS = [
  { id: 'new-sandbox', to: '/sandboxes/manage', icon: 'sandbox', label: '沙盒管理' },
  { id: 'pricing', to: '/pricing', icon: 'price', label: '积分' },
  { id: 'team-space', to: '/team-space', icon: 'team', label: '团队空间' },
  { id: 'settings', to: '/settings', icon: 'settings', label: '设置' },
] as const

const WORKBENCH_PANEL_ITEMS = [...NAV_ITEMS, ...ACCOUNT_NAV_ITEMS] as const

type WorkbenchPanelId =
  | (typeof NAV_ITEMS)[number]['id']
  | (typeof ACCOUNT_NAV_ITEMS)[number]['id']

export default function Layout() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const credits = typeof user?.credits === 'number' ? user.credits.toLocaleString() : '0'
  const teamSpaceName = user?.active_workspace?.name || '个人空间'
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [accountCollapsed, setAccountCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ACCOUNT_SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [accountSectionOpen, setAccountSectionOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(ACCOUNT_SECTION_OPEN_KEY)
      return raw === null ? true : raw === '1'
    } catch {
      return true
    }
  })
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
      return Number.isFinite(raw) && raw >= LEFT_SIDEBAR_MIN && raw <= LEFT_SIDEBAR_MAX ? raw : LEFT_SIDEBAR_DEFAULT
    } catch {
      return LEFT_SIDEBAR_DEFAULT
    }
  })
  const [accountSidebarWidth, setAccountSidebarWidth] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(ACCOUNT_SIDEBAR_WIDTH_KEY))
      return Number.isFinite(raw) && raw >= RIGHT_SIDEBAR_MIN && raw <= RIGHT_SIDEBAR_MAX ? raw : RIGHT_SIDEBAR_DEFAULT
    } catch {
      return RIGHT_SIDEBAR_DEFAULT
    }
  })
  const [workbenchPanelWidth, setWorkbenchPanelWidth] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(WORKBENCH_PANEL_WIDTH_KEY))
      return Number.isFinite(raw) && raw >= WORKBENCH_PANEL_MIN && raw <= WORKBENCH_PANEL_MAX ? raw : WORKBENCH_PANEL_DEFAULT
    } catch {
      return WORKBENCH_PANEL_DEFAULT
    }
  })
  const [activeWorkbenchPanel, setActiveWorkbenchPanel] = useState<WorkbenchPanelId | null>(null)
  const [currentSandboxId, setCurrentSandboxId] = useState<number | null>(null)
  const [targetConversationId, setTargetConversationId] = useState<number | null>(null)
  const [targetConversationNonce, setTargetConversationNonce] = useState(0)
  const [currentSandboxLabel, setCurrentSandboxLabel] = useState('未选择沙盒')
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<AgentFile | null>(null)
  const [selectedPreviewFileId, setSelectedPreviewFileId] = useState<number | null>(null)
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | 'workbench' | null>(null)
  const [navOrder, setNavOrder] = useState<string[]>(() => readStoredOrder(WORKBENCH_NAV_ORDER_KEY))
  const [accountNavOrder, setAccountNavOrder] = useState<string[]>(() => readStoredOrder(ACCOUNT_NAV_ORDER_KEY))
  const [draggedNavId, setDraggedNavId] = useState<string | null>(null)
  const [draggedAccountNavId, setDraggedAccountNavId] = useState<string | null>(null)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceSummary[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<number | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('')
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const layoutRootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    localStorage.setItem(ACCOUNT_SIDEBAR_COLLAPSED_KEY, accountCollapsed ? '1' : '0')
  }, [accountCollapsed])

  useEffect(() => {
    localStorage.setItem(ACCOUNT_SECTION_OPEN_KEY, accountSectionOpen ? '1' : '0')
  }, [accountSectionOpen])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    localStorage.setItem(ACCOUNT_SIDEBAR_WIDTH_KEY, String(accountSidebarWidth))
  }, [accountSidebarWidth])

  useEffect(() => {
    localStorage.setItem(WORKBENCH_PANEL_WIDTH_KEY, String(workbenchPanelWidth))
  }, [workbenchPanelWidth])

  useEffect(() => {
    localStorage.setItem(WORKBENCH_NAV_ORDER_KEY, JSON.stringify(navOrder))
  }, [navOrder])

  useEffect(() => {
    localStorage.setItem(ACCOUNT_NAV_ORDER_KEY, JSON.stringify(accountNavOrder))
  }, [accountNavOrder])

  useEffect(() => {
    const workspaceId = user?.active_workspace_id
    if (!workspaceId) {
      setCurrentSandboxId(null)
      setCurrentSandboxLabel('未选择沙盒')
      return
    }
    const raw = localStorage.getItem(`${CURRENT_SANDBOX_KEY_PREFIX}${workspaceId}`)
    const nextId = raw ? Number(raw) : null
    if (nextId && Number.isFinite(nextId)) {
      setCurrentSandboxId(nextId)
      setCurrentSandboxLabel(`沙盒 #${nextId}`)
      return
    }
    setCurrentSandboxId(null)
    setCurrentSandboxLabel('未选择沙盒')
  }, [user?.active_workspace_id])

  useEffect(() => {
    const workspaceId = user?.active_workspace_id
    if (!workspaceId) return
    if (currentSandboxId) {
      localStorage.setItem(`${CURRENT_SANDBOX_KEY_PREFIX}${workspaceId}`, String(currentSandboxId))
    } else {
      localStorage.removeItem(`${CURRENT_SANDBOX_KEY_PREFIX}${workspaceId}`)
    }
  }, [currentSandboxId, user?.active_workspace_id])

  useEffect(() => {
    setSelectedPreviewFileId(null)
    setSelectedPreviewFile(null)
  }, [currentSandboxId])

  useEffect(() => {
    if (!user) {
      setAvatarDataUrl('')
      return
    }
    setAvatarDataUrl(localStorage.getItem(`${USER_AVATAR_PREFIX}${user.id}`) || '')
  }, [user?.id])

  useEffect(() => {
    const routePanel = getWorkbenchPanelFromPath(location.pathname)
    if (routePanel) setActiveWorkbenchPanel(routePanel)
  }, [location.pathname])

  useEffect(() => {
    if (!workspaceMenuOpen || !user) return

    let active = true
    setWorkspaceLoading(true)
    listWorkspaces()
      .then((res) => {
        if (active) setWorkspaceOptions(res.data)
      })
      .finally(() => {
        if (active) setWorkspaceLoading(false)
      })

    return () => {
      active = false
    }
  }, [workspaceMenuOpen, user])

  useEffect(() => {
    if (!workspaceMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!workspaceMenuRef.current?.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [workspaceMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      setAvatarDataUrl(value)
      localStorage.setItem(`${USER_AVATAR_PREFIX}${user.id}`, value)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleWorkspaceSwitch = async (workspace: WorkspaceSummary) => {
    if (workspace.id === user?.active_workspace_id) {
      setWorkspaceMenuOpen(false)
      return
    }
    setSwitchingWorkspaceId(workspace.id)
    try {
      await switchWorkspace(workspace.id)
      await refreshUser()
      setWorkspaceMenuOpen(false)
    } finally {
      setSwitchingWorkspaceId(null)
    }
  }

  const openWorkbenchPanel = (panel: string) => {
    if (isWorkbenchPanelId(panel)) setActiveWorkbenchPanel(panel)
  }

  const handleSandboxChange = (
    taskId: number | null,
    sandbox?: SandboxRecord | WorkspaceTaskSummary | null,
    conversationId?: number | null,
  ) => {
    setCurrentSandboxId(taskId)
    setTargetConversationId(conversationId ?? null)
    if (conversationId) setTargetConversationNonce((current) => current + 1)
    setCurrentSandboxLabel(sandbox?.title || (taskId ? `沙盒 #${taskId}` : '未选择沙盒'))
  }

  const handleSandboxCreated = (taskId: number) => {
    setCurrentSandboxId(taskId)
    setCurrentSandboxLabel(`沙盒 #${taskId}`)
    setActiveWorkbenchPanel('sandboxes')
  }

  const handlePreviewFileSelect = (fileId: number, file?: AgentFile | null) => {
    setSelectedPreviewFileId(fileId)
    setSelectedPreviewFile(file || null)
  }

  const handlePreviewClose = () => {
    setSelectedPreviewFileId(null)
    setSelectedPreviewFile(null)
  }

  const orderedNavItems = useMemo(() => sortItemsByStoredOrder(NAV_ITEMS, navOrder), [navOrder])
  const orderedAccountNavItems = useMemo(() => sortItemsByStoredOrder(ACCOUNT_NAV_ITEMS, accountNavOrder), [accountNavOrder])

  const startResize = (side: 'left' | 'right' | 'workbench', startX: number) => {
    const startWidth = side === 'left' ? sidebarWidth : side === 'right' ? accountSidebarWidth : workbenchPanelWidth
    const root = layoutRootRef.current
    let frame = 0
    let latestWidth = startWidth
    const cssVar =
      side === 'left'
        ? '--wensai-left-sidebar-width'
        : side === 'right'
          ? '--wensai-account-sidebar-width'
          : '--wensai-workbench-panel-width'

    const setLiveWidth = (width: number) => {
      latestWidth = width
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        root?.style.setProperty(cssVar, `${latestWidth}px`)
      })
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (side === 'left') {
        const nextWidth = Math.max(LEFT_SIDEBAR_MIN, Math.min(LEFT_SIDEBAR_MAX, startWidth + (event.clientX - startX)))
        setLiveWidth(nextWidth)
      } else if (side === 'right') {
        const nextWidth = Math.max(RIGHT_SIDEBAR_MIN, Math.min(RIGHT_SIDEBAR_MAX, startWidth - (event.clientX - startX)))
        setLiveWidth(nextWidth)
      } else {
        const nextWidth = Math.max(WORKBENCH_PANEL_MIN, Math.min(WORKBENCH_PANEL_MAX, startWidth - (event.clientX - startX)))
        setLiveWidth(nextWidth)
      }
    }

    const handleMouseUp = () => {
      if (frame) window.cancelAnimationFrame(frame)
      root?.style.setProperty(cssVar, `${latestWidth}px`)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      root?.classList.remove('is-resizing-panels')
      setResizingSide(null)
      if (side === 'left') setSidebarWidth(latestWidth)
      else if (side === 'right') setAccountSidebarWidth(latestWidth)
      else setWorkbenchPanelWidth(latestWidth)
    }

    setResizingSide(side)
    root?.classList.add('is-resizing-panels')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const moveNavItem = (targetId: string) => {
    if (!draggedNavId || draggedNavId === targetId) return
    setNavOrder((current) => reorderIds(current.length ? current : NAV_ITEMS.map((item) => item.id), draggedNavId, targetId))
  }

  const moveAccountNavItem = (targetId: string) => {
    if (!draggedAccountNavId || draggedAccountNavId === targetId) return
    setAccountNavOrder((current) =>
      reorderIds(current.length ? current : ACCOUNT_NAV_ITEMS.map((item) => item.id), draggedAccountNavId, targetId),
    )
  }

  const handleNavDragStart = (event: React.DragEvent<HTMLButtonElement>, itemId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    setDraggedNavId(itemId)
  }

  const handleAccountNavDragStart = (event: React.DragEvent<HTMLButtonElement>, itemId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
    setDraggedAccountNavId(itemId)
  }

  return (
    <div className="h-full bg-[#edf1f5] text-slate-950">
      <div className={['flex h-full w-full', isDesktopShell() ? 'p-0' : 'p-0'].join(' ')}>
        <div
          ref={layoutRootRef}
          className={[
            'flex h-full w-full overflow-hidden bg-white',
            isDesktopShell() ? '' : 'border border-slate-200 shadow-sm',
          ].join(' ')}
          style={
            {
              '--wensai-left-sidebar-width': `${sidebarWidth}px`,
              '--wensai-account-sidebar-width': `${accountSidebarWidth}px`,
              '--wensai-workbench-panel-width': `${workbenchPanelWidth}px`,
            } as React.CSSProperties
          }
        >
          <aside
            className={[
              'relative hidden shrink-0 bg-[#f7f8fa] transition-[width] duration-200 md:flex md:flex-col',
              collapsed ? 'w-0 overflow-visible border-r-0' : 'border-r border-slate-200 shadow-[8px_0_24px_rgba(15,23,42,0.04)]',
            ].join(' ')}
            style={collapsed ? undefined : { width: 'var(--wensai-left-sidebar-width)' }}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="absolute left-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
                title="展开左栏"
              >
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            ) : (
              <>
                <div className="flex h-14 items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
                      <Icon name="folder" className="h-5 w-5 text-slate-700" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">资源管理器</p>
                      <p className="text-xs text-slate-500">当前沙盒文件</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCollapsed(true)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                      title="折叠左栏"
                    >
                      <Icon name="chevronLeft" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <WorkspaceExplorer
                  collapsed={collapsed}
                  workspaceId={user?.active_workspace_id}
                  sandboxId={currentSandboxId}
                  sandboxName={currentSandboxLabel}
                  onSelectSandbox={handleSandboxChange}
                  onOpenSandboxManage={() => setActiveWorkbenchPanel('new-sandbox')}
                  selectedFileId={selectedPreviewFileId}
                  onSelectFile={handlePreviewFileSelect}
                />
              </>
            )}
          </aside>

          {!collapsed ? (
            <SidebarResizeHandle
              side="left"
              active={resizingSide === 'left'}
              onMouseDown={(event) => startResize('left', event.clientX)}
              onDoubleClick={() => setSidebarWidth(LEFT_SIDEBAR_DEFAULT)}
            />
          ) : null}

          <section className="flex min-w-0 basis-0 flex-1 flex-col bg-white">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-xs text-slate-500">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="菜单"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
                  >
                    <Icon name="menu" className="h-4 w-4" />
                  </button>
                  <span>{APP_NAME}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveWorkbenchPanel('pricing')}
                  className={[
                    'hidden items-center gap-3 rounded-full border px-3 py-1.5 text-left text-slate-700 transition sm:inline-flex',
                    activeWorkbenchPanel === 'pricing'
                      ? 'border-amber-200 bg-amber-100'
                      : 'border-amber-100 bg-amber-50/80 hover:border-amber-200 hover:bg-amber-50',
                  ].join(' ')}
                  title="打开积分界面"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-amber-600">
                    <Icon name="price" className="h-3.5 w-3.5" />
                  </span>
                  <div className="leading-none">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">积分</p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">{credits}</p>
                  </div>
                </button>
                <div className="relative" ref={workspaceMenuRef}>
                  <button
                    type="button"
                    onClick={() => setWorkspaceMenuOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/70 px-3 py-1.5 text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-cyan-700">
                      <Icon name="team" className="h-3.5 w-3.5" />
                    </span>
                    <span className="max-w-[200px] truncate text-xs font-medium">{teamSpaceName}</span>
                    <Icon
                      name="chevronDown"
                      className={[
                        'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                        workspaceMenuOpen ? 'rotate-180' : 'rotate-0',
                      ].join(' ')}
                    />
                  </button>

                  {workspaceMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[320px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                      <div className="px-3 pb-2 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          切换工作空间
                        </p>
                      </div>
                      <div className="space-y-1">
                        {workspaceLoading ? (
                          <div className="px-3 py-4 text-sm text-slate-500">正在加载工作空间...</div>
                        ) : (
                          workspaceOptions.map((workspace) => {
                            const isLocalSpace = workspace.name === '个人空间' || workspace.name === '本地空间'
                            const isActive = workspace.id === user?.active_workspace_id
                            const isSwitching = switchingWorkspaceId === workspace.id
                            return (
                              <button
                                key={workspace.id}
                                type="button"
                                disabled={isSwitching}
                                onClick={() => handleWorkspaceSwitch(workspace)}
                                className={[
                                  'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition',
                                  isActive
                                    ? 'bg-cyan-50 text-slate-950'
                                    : 'text-slate-700 hover:bg-slate-50',
                                  isSwitching ? 'opacity-60' : 'opacity-100',
                                ].join(' ')}
                              >
                                <span
                                  className={[
                                    'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
                                    isActive ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-500',
                                  ].join(' ')}
                                >
                                  <Icon name="team" className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold">{workspace.name}</span>
                                    {isLocalSpace ? (
                                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                                        个人
                                      </span>
                                    ) : null}
                                    {isActive ? (
                                      <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                                        当前
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-1 block truncate text-xs leading-5 text-slate-500">
                                    {isLocalSpace
                                      ? '个人空间文件会持续保留，不会自动销毁。'
                                      : `${workspace.member_count} 位成员 · 邀请码 ${workspace.invite_code}`}
                                  </span>
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                      <div className="mt-2 border-t border-slate-100 px-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setWorkspaceMenuOpen(false)
                            setActiveWorkbenchPanel('team-space')
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          <span>管理团队空间</span>
                          <Icon name="chevronRight" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setAccountCollapsed((current) => !current)}
                  className="hidden h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 lg:grid"
                  title={accountCollapsed ? '展开右栏' : '折叠右栏'}
                >
                  <Icon name={accountCollapsed ? 'chevronLeft' : 'chevronRight'} className="h-4 w-4" />
                </button>
              </div>
            </header>
            <main className="flex min-h-0 flex-1 overflow-hidden bg-[#f3f6fb]">
              <div className="min-w-0 flex-1 overflow-y-auto bg-[#f3f6fb]">
                {selectedPreviewFileId ? (
                  <WorkspacePreviewPage fileId={selectedPreviewFileId} fileMeta={selectedPreviewFile} onClose={handlePreviewClose} />
                ) : (
                  <EmptyPreviewState />
                )}
              </div>
              {activeWorkbenchPanel ? (
                <>
                  <SidebarResizeHandle
                    side="right"
                    active={resizingSide === 'workbench'}
                    onMouseDown={(event) => startResize('workbench', event.clientX)}
                    onDoubleClick={() => setWorkbenchPanelWidth(WORKBENCH_PANEL_DEFAULT)}
                  />
                  <aside
                    className="hidden min-h-0 shrink-0 overflow-hidden border-l border-slate-200 bg-[#f6f8fc] shadow-[-8px_0_24px_rgba(15,23,42,0.04)] lg:flex lg:flex-col"
                    style={{ width: 'var(--wensai-workbench-panel-width)' }}
                  >
                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name={getWorkbenchPanelMeta(activeWorkbenchPanel).icon} className="h-4 w-4 shrink-0 text-slate-500" />
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {getWorkbenchPanelMeta(activeWorkbenchPanel).label}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkbenchPanel(null)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                        title="关闭界面"
                      >
                        ×
                      </button>
                    </div>
                    <div className={['min-h-0 flex-1', activeWorkbenchPanel === 'sandboxes' ? 'overflow-hidden' : 'overflow-y-auto'].join(' ')}>
                        <WorkbenchProvider
                          value={{
                            inWorkbenchPanel: true,
                            openWorkbenchPanel,
                            compactWorkbench: workbenchPanelWidth <= 560,
                          }}
                        >
                        <WorkbenchPanelContent
                          panel={activeWorkbenchPanel}
                          selectedSandboxId={currentSandboxId}
                          targetConversationId={targetConversationId}
                          targetConversationNonce={targetConversationNonce}
                          onSelectSandbox={handleSandboxChange}
                          onSandboxCreated={handleSandboxCreated}
                        />
                      </WorkbenchProvider>
                    </div>
                  </aside>
                </>
              ) : null}
            </main>
          </section>

          {!accountCollapsed ? (
            <SidebarResizeHandle
              side="right"
              active={resizingSide === 'right'}
              onMouseDown={(event) => startResize('right', event.clientX)}
              onDoubleClick={() => setAccountSidebarWidth(RIGHT_SIDEBAR_DEFAULT)}
            />
          ) : null}

          <aside
            className={[
              'relative hidden shrink-0 bg-[#f7f8fa] transition-[width] duration-200 lg:flex lg:flex-col',
              accountCollapsed ? 'w-0 overflow-visible border-l-0' : 'border-l border-slate-200 shadow-[-8px_0_24px_rgba(15,23,42,0.04)]',
            ].join(' ')}
            style={accountCollapsed ? undefined : { width: 'var(--wensai-account-sidebar-width)' }}
          >
            {accountCollapsed ? null : (
              <>
                <div className="flex-1 space-y-3 px-3 pt-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="px-3 pb-2 pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">工作区</p>
                    </div>
                    <div className="space-y-1">
                      {orderedNavItems.map((item) => (
                        <WorkbenchPanelButton
                          key={item.id}
                          icon={item.icon}
                          label={item.label}
                          active={activeWorkbenchPanel === item.id}
                          onClick={() => setActiveWorkbenchPanel(item.id)}
                          draggable
                          onDragStart={(event) => handleNavDragStart(event, item.id)}
                          onDragOver={(event) => {
                            event.preventDefault()
                            event.dataTransfer.dropEffect = 'move'
                          }}
                          onDrop={() => moveNavItem(item.id)}
                          onDragEnd={() => setDraggedNavId(null)}
                          dragging={draggedNavId === item.id}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setAccountSectionOpen((current) => !current)}
                      className="flex h-12 w-full items-center justify-between rounded-xl px-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
                          <Icon name="user" className="h-4.5 w-4.5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-950">账号</span>
                          <span className="block text-xs text-slate-500">{user?.username || APP_NAME}</span>
                        </span>
                      </span>
                      <Icon
                        name="chevronDown"
                        className={[
                          'h-4 w-4 text-slate-400 transition-transform duration-200',
                          accountSectionOpen ? 'rotate-180' : 'rotate-0',
                        ].join(' ')}
                      />
                    </button>

                    {accountSectionOpen ? (
                      <div className="mt-2 space-y-1 border-t border-slate-100 px-1 pt-2">
                        {orderedAccountNavItems.map((item) => (
                          <WorkbenchPanelButton
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            active={activeWorkbenchPanel === item.id}
                            onClick={() => setActiveWorkbenchPanel(item.id)}
                            draggable
                            onDragStart={(event) => handleAccountNavDragStart(event, item.id)}
                            onDragOver={(event) => {
                              event.preventDefault()
                              event.dataTransfer.dropEffect = 'move'
                            }}
                            onDrop={() => moveAccountNavItem(item.id)}
                            onDragEnd={() => setDraggedAccountNavId(null)}
                            dragging={draggedAccountNavId === item.id}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-auto border-t border-slate-200 px-4 py-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="group relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-950 text-white ring-1 ring-slate-200 transition hover:ring-cyan-200"
                        title="上传头像"
                      >
                        {avatarDataUrl ? (
                          <img src={avatarDataUrl} alt="头像" className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="user" className="h-6 w-6" />
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 py-0.5 text-[10px] font-medium opacity-0 transition group-hover:opacity-100">
                          更换
                        </span>
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">账号概览</p>
                        <p className="mt-1 truncate text-base font-semibold text-slate-950">{user?.username || APP_NAME}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">当前空间：{teamSpaceName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>

        </div>
      </div>
    </div>
  )
}

function WorkbenchPanelButton({
  icon,
  label,
  active,
  onClick,
  draggable = false,
  dragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
  draggable?: boolean
  dragging?: boolean
  onDragStart?: React.DragEventHandler<HTMLButtonElement>
  onDragOver?: React.DragEventHandler<HTMLButtonElement>
  onDrop?: React.DragEventHandler<HTMLButtonElement>
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition',
        draggable ? 'cursor-grab active:cursor-grabbing' : '',
        dragging ? 'opacity-45 ring-1 ring-cyan-200' : '',
        active ? 'bg-slate-200/80 text-slate-950' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
      ].join(' ')}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function WorkbenchPanelContent({
  panel,
  selectedSandboxId,
  targetConversationId,
  targetConversationNonce,
  onSelectSandbox,
  onSandboxCreated,
}: {
  panel: WorkbenchPanelId
  selectedSandboxId: number | null
  targetConversationId: number | null
  targetConversationNonce: number
  onSelectSandbox: (taskId: number | null, sandbox?: SandboxRecord | null, conversationId?: number | null) => void
  onSandboxCreated: (taskId: number) => void
}) {
  if (panel === 'home') return <DashboardPage />
  if (panel === 'sandboxes') {
    return (
      <SandboxWorkspacePage
        selectedTaskId={selectedSandboxId}
        targetConversationId={targetConversationId}
        targetConversationNonce={targetConversationNonce}
        onSelectTaskId={onSelectSandbox}
      />
    )
  }
  if (panel === 'new-sandbox') {
    return (
      <SandboxManagePage
        selectedSandboxId={selectedSandboxId}
        onSelectSandbox={onSelectSandbox}
        onSandboxCreated={onSandboxCreated}
      />
    )
  }
  if (panel === 'history') return <SandboxHistoryPage onSelectSandbox={onSelectSandbox} />
  if (panel === 'suggestions') return <SuggestionExportPage selectedSandboxId={selectedSandboxId} />
  if (panel === 'pricing') return <PricingPage />
  if (panel === 'team-space') return <TeamSpacePage />
  if (panel === 'settings') return <SettingsPage />
  return null
}

function EmptyPreviewState() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#f6f8fb] p-6">
      <div className="max-w-md rounded-3xl border border-dashed border-slate-200 bg-white/80 px-8 py-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
          <Icon name="file" className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-slate-950">选择文件开始预览</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          左侧文件资源管理器是唯一会打开预览的入口。右侧工作区只负责沙盒、历史、团队空间和设置。
        </p>
      </div>
    </div>
  )
}

function getWorkbenchPanelMeta(panel: WorkbenchPanelId) {
  if (panel === 'new-sandbox') {
    return { id: 'new-sandbox', icon: 'sandbox', label: '沙盒管理' }
  }
  return WORKBENCH_PANEL_ITEMS.find((item) => item.id === panel) || WORKBENCH_PANEL_ITEMS[0]
}

function isWorkbenchPanelId(value: string): value is WorkbenchPanelId {
  return WORKBENCH_PANEL_ITEMS.some((item) => item.id === value)
}

function readStoredOrder(key: string) {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function sortItemsByStoredOrder<T extends { id: string }>(items: readonly T[], storedOrder: string[]) {
  const storedIndex = new Map(storedOrder.map((id, index) => [id, index]))
  return [...items].sort((a, b) => {
    const aIndex = storedIndex.get(a.id)
    const bIndex = storedIndex.get(b.id)
    if (aIndex === undefined && bIndex === undefined) return 0
    if (aIndex === undefined) return 1
    if (bIndex === undefined) return -1
    return aIndex - bIndex
  })
}

function reorderIds(ids: string[], draggedId: string, targetId: string) {
  const base = Array.from(new Set(ids))
  if (!base.includes(draggedId)) base.push(draggedId)
  if (!base.includes(targetId)) base.push(targetId)
  const next = [...base]
  const fromIndex = next.indexOf(draggedId)
  const toIndex = next.indexOf(targetId)
  if (fromIndex === -1 || toIndex === -1) return next
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function getWorkbenchPanelFromPath(pathname: string): WorkbenchPanelId | null {
  if (pathname === '/sandboxes') return 'sandboxes'
  if (pathname === '/history') return 'history'
  if (pathname === '/suggestions') return 'suggestions'
  if (pathname === '/pricing') return 'pricing'
  if (pathname === '/team-space') return 'team-space'
  if (pathname === '/settings') return 'settings'
  return null
}

function SidebarResizeHandle({
  side,
  active,
  onMouseDown,
  onDoubleClick,
}: {
  side: 'left' | 'right'
  active: boolean
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void
  onDoubleClick: () => void
}) {
  return (
    <div
      onMouseDown={(event) => {
        event.preventDefault()
        onMouseDown(event)
      }}
      onDoubleClick={onDoubleClick}
      className={[
        'group relative hidden w-2 shrink-0 cursor-col-resize',
        side === 'left' ? 'md:block' : 'lg:block',
      ].join(' ')}
      title="拖动调整边栏宽度，双击恢复默认"
    >
      <div
        className={[
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors',
          active ? 'bg-cyan-400' : 'bg-slate-200 group-hover:bg-cyan-300',
        ].join(' ')}
      />
      <div
        className={[
          'absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
          active ? 'bg-cyan-400' : 'bg-transparent group-hover:bg-cyan-300',
        ].join(' ')}
      />
    </div>
  )
}
