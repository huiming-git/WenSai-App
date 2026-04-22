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
}

interface ChipProps {
  children: React.ReactNode
  active?: boolean
}

interface PanelProps {
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
    check: <path d="m20 6-11 11-5-5" />,
    file: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
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

export function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium no-underline transition',
          isActive
            ? 'bg-slate-200/80 text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
    >
      <Icon name={icon} className="h-4 w-4" />
      <span>{label}</span>
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

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
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
