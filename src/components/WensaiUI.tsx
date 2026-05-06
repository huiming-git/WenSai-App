import { NavLink } from 'react-router-dom'
import { APP_NAME } from '../data/wensai'

interface IconProps {
  name: string
  className?: string
}

interface LogoMarkProps {
  className?: string
  showName?: boolean
}

interface NavItemProps {
  to: string
  icon: string
  label: string
  end?: boolean
  collapsed?: boolean
}

interface ChipProps {
  children: React.ReactNode
  active?: boolean
}

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  className?: string
}

interface EmptyStateProps {
  title: string
  description: string
}

export function Icon({ name, className = 'h-5 w-5' }: IconProps) {
  const props = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V20h11v-9.5" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    history: (
      <>
        <path d="M4 12a8 8 0 1 0 2.35-5.65" />
        <path d="M4 5v5h5" />
        <path d="M12 8v4l3 2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
    suggest: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h6M10 17h4" />
      </>
    ),
    price: (
      <>
        <path d="M20 7 12 3 4 7l8 4 8-4Z" />
        <path d="m4 12 8 4 8-4" />
        <path d="m4 17 8 4 8-4" />
      </>
    ),
    settings: (
      <>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path d="M3 12h2m14 0h2M12 3v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    send: (
      <>
        <path d="M21 3 10 14" />
        <path d="m21 3-7 18-4-7-7-4 18-7Z" />
      </>
    ),
    queueSend: (
      <>
        <path d="M5 6h9M5 12h7M5 18h5" />
        <path d="M16 15h5" />
        <path d="M18.5 12.5 21 15l-2.5 2.5" />
        <path d="M15 19h6" />
      </>
    ),
    check: <path d="m20 6-11 11-5-5" />,
    camera: (
      <>
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H9l1.5-2h3L15 6h2.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
        <circle cx="12" cy="12.5" r="3.25" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7.5h6l2 2H21v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        <path d="M3 7.5v-.5a2 2 0 0 1 2-2h4l2 2h4" />
      </>
    ),
    sandbox: (
      <>
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5Z" />
        <path d="M4 8.5 12 13l8-4.5" />
        <path d="M12 13v7" />
      </>
    ),
    team: (
      <>
        <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 18.5V20" />
        <circle cx="12" cy="9" r="3" />
        <path d="M18.5 20v-1a2.5 2.5 0 0 0-2.5-2.5" />
        <path d="M15.5 6.8a2.7 2.7 0 0 1 0 4.4" />
        <path d="M5.5 20v-1A2.5 2.5 0 0 1 8 16.5" />
        <path d="M8.5 6.8a2.7 2.7 0 0 0 0 4.4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8.5" r="3.25" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    interface: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2.5" />
        <path d="M4 9h16" />
        <path d="M8 13h3" />
        <path d="M8 16h8" />
        <path d="M14 13h2" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: <path d="M20 11a8 8 0 1 0 2 5.3M20 4v7h-7" />,
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    reload: (
      <>
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M6.5 9A6.5 6.5 0 0 1 17 6.5L20 11" />
        <path d="M17.5 15A6.5 6.5 0 0 1 7 17.5L4 13" />
      </>
    ),
    collapseRight: (
      <>
        <path d="M19 4v16" />
        <path d="m9 18 6-6-6-6" />
        <path d="M5 6v12" />
      </>
    ),
    grip: (
      <>
        <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
      </>
    ),
  }

  return <svg {...props}>{paths[name] || paths.home}</svg>
}

export function LogoMark({ className = 'h-10 w-10', showName = false }: LogoMarkProps) {
  const logoSrc = `${import.meta.env.BASE_URL}wensai-logo.png`

  return (
    <div className="flex items-center gap-2">
      <img
        src={logoSrc}
        alt={APP_NAME}
        className={`${className} rounded-lg object-contain`}
      />
      {showName ? (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{APP_NAME}</p>
          <p className="text-xs text-slate-500">赛事材料修改助手</p>
        </div>
      ) : null}
    </div>
  )
}

export function NavItem({ to, icon, label, end, collapsed = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex h-10 items-center rounded-lg px-3 text-sm font-medium no-underline transition',
          collapsed ? 'justify-center gap-0 px-0' : 'gap-3',
          isActive
            ? 'bg-slate-200/80 text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
    >
      <Icon name={icon} className="h-4 w-4" />
      {!collapsed ? <span>{label}</span> : null}
    </NavLink>
  )
}

export function Chip({ children, active = false }: ChipProps) {
  return (
    <span
      className={[
        'inline-flex h-8 items-center rounded-full px-3 text-xs font-medium',
        active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export function Panel({ children, className = '', ...props }: PanelProps) {
  return (
    <section {...props} className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {children}
    </section>
  )
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
      <div>
        <LogoMark className="mx-auto h-14 w-14" />
        <p className="mt-4 font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}
