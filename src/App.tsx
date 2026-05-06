import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { getCurrentWindow } from '@tauri-apps/api/window'
import Layout from './components/Layout'
import TitleBar from './components/TitleBar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SandboxHistoryPage from './pages/SandboxHistoryPage'
import SuggestionExportPage from './pages/SuggestionExportPage'
import PricingPage from './pages/PricingPage'
import SettingsPage from './pages/SettingsPage'
import TaskCreatePage from './pages/TaskCreatePage'
import TaskDetailPage from './pages/TaskDetailPage'
import TeamSpacePage from './pages/TeamSpacePage'
import WorkspacePreviewPage from './pages/WorkspacePreviewPage'
import SandboxWorkspacePage from './pages/SandboxWorkspacePage'
import { isDesktopShell, isNativeShell } from './platform'

export default function App() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isNativeShell() || !isDesktopShell()) return

    const appWindow = getCurrentWindow()
    let unlistenResize: (() => void) | undefined

    const syncWindowState = () => {
      void appWindow.isMaximized().then(setIsMaximized).catch(() => setIsMaximized(false))
    }

    syncWindowState()
    void appWindow.onResized(syncWindowState).then((unlisten) => {
      unlistenResize = unlisten
    })

    return () => {
      unlistenResize?.()
    }
  }, [])

  return (
    <div className={['app-root-shell flex h-screen flex-col', isDesktopShell() ? 'bg-transparent' : 'bg-white'].join(' ')}>
      <div
        className={[
          'app-shell-surface min-h-0 flex flex-1 flex-col',
          isDesktopShell()
            ? [
                'overflow-hidden bg-white',
                isMaximized ? '' : 'rounded-[18px] ring-1 ring-slate-200/80',
              ].join(' ')
            : '',
        ].join(' ')}
      >
        {isNativeShell() && isDesktopShell() && <TitleBar />}
        <div className="min-h-0 flex-1">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/team-space" element={<TeamSpacePage />} />
              <Route path="/history" element={<SandboxHistoryPage />} />
              <Route path="/suggestions" element={<SuggestionExportPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/workspace/files/:fileId" element={<WorkspacePreviewPage />} />
              <Route path="/sandboxes" element={<SandboxWorkspacePage />} />
              <Route path="/agent-tasks/new" element={<TaskCreatePage />} />
              <Route path="/agent-tasks/:id" element={<TaskDetailPage />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  )
}
