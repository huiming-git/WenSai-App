import { getCurrentWindow } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()

export default function TitleBar() {
  const startDrag = (e: React.MouseEvent) => {
    // Only drag from the bar itself, not from buttons
    if ((e.target as HTMLElement).closest('button')) return
    appWindow.startDragging()
  }

  return (
    <div
      onMouseDown={startDrag}
      className="flex h-8 shrink-0 items-center justify-between bg-[#eef3f8] select-none"
    >
      <span className="pointer-events-none pl-3 text-xs font-medium text-slate-500">
        问赛
      </span>
      <div className="flex h-full">
        <button
          type="button"
          onClick={() => appWindow.minimize()}
          className="grid h-full w-11 place-items-center text-slate-500 hover:bg-slate-200/80"
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          type="button"
          onClick={() => appWindow.toggleMaximize()}
          className="grid h-full w-11 place-items-center text-slate-500 hover:bg-slate-200/80"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" /></svg>
        </button>
        <button
          type="button"
          onClick={() => appWindow.close()}
          className="grid h-full w-11 place-items-center text-slate-500 hover:bg-red-500 hover:text-white"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
    </div>
  )
}
