import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../data/wensai'
import { Icon, LogoMark, NavItem } from './WensaiUI'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-full bg-[#edf1f5] text-slate-950">
      <div className="mx-auto flex h-full max-w-[1680px] p-0 lg:p-3">
        <div className="flex h-full w-full overflow-hidden border border-slate-200 bg-white shadow-sm lg:rounded-lg">
          <aside className="hidden w-[272px] shrink-0 border-r border-slate-200 bg-[#f7f8fa] md:flex md:flex-col">
            <div className="flex h-14 items-center justify-between px-3">
              <LogoMark showName className="h-10 w-10" />
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                v1.0
              </span>
            </div>

            <div className="px-3 pb-3">
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  placeholder="搜索任务"
                />
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-3">
              <NavItem to="/" end icon="home" label="首页" />
              <NavItem to="/history" icon="history" label="历史" />
              <NavItem to="/upload" icon="upload" label="上传" />
              <NavItem to="/suggestions" icon="suggest" label="建议" />
              <NavItem to="/pricing" icon="price" label="收费" />
              <NavItem to="/settings" icon="settings" label="设置" />
            </nav>

            <div className="px-3 py-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">任务状态</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">等待上传材料或输入修改命令。</p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <LogoMark className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user?.username || APP_NAME}
                  </p>
                  <p className="text-xs text-slate-500">本地与后端同步</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              >
                退出
              </button>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col bg-white">
            <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-xs text-slate-500">
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
              <span>赛事材料修改工作台</span>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto bg-white">
              <Outlet />
            </main>
          </section>
        </div>
      </div>
    </div>
  )
}
