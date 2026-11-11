'use client'

import { Bell, LogOut, Menu, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/lib/auth-store'
import { BrandMark } from '@/components/brand-logo'
import type { MainTab } from '@/components/app/nav'
import { cn } from '@/lib/utils'

type Tab = { id: MainTab; label: string; icon: LucideIcon }

const tooltip =
  'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100'

/** An icon button whose name shows up next to it while the cursor is over it (or it has focus). */
function RailItem({ label, onClick, active, children, haspopup }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode; haspopup?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      aria-haspopup={haspopup ? 'dialog' : undefined}
      className={cn('group relative flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none', active && 'bg-secondary')}
    >
      {children}
      <span role="tooltip" className={tooltip}>
        {label}
      </span>
    </button>
  )
}

/**
 * Left icon rail for computers (md and up). Phones keep the top header and the bottom
 * tab bar; this replaces both on wide screens.
 */
export function DesktopSidebar({
  tabs,
  active,
  onTab,
  isGuest,
  name,
  roleLabel,
  roleClass,
  unreadCount,
  onNotifications,
  onSettings,
}: {
  tabs: Tab[]
  active: MainTab | null
  onTab: (tab: MainTab) => void
  isGuest: boolean
  name: string
  roleLabel: string
  roleClass: string
  unreadCount: number
  onNotifications: () => void
  onSettings: () => void
}) {
  return (
    <aside className="sticky top-0 z-40 hidden h-dvh w-[72px] shrink-0 flex-col items-center border-r border-border bg-background py-6 md:flex">
      <div className="pb-8">
        <BrandMark />
      </div>

      <nav aria-label="Secciones" className="flex flex-col items-center gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <RailItem key={id} label={label} active={active === id} onClick={() => onTab(id)}>
            <Icon className={cn('size-6', id === 'match' && 'text-olympic-blue')} strokeWidth={active === id ? 2.5 : 1.75} />
          </RailItem>
        ))}
        {!isGuest ? (
          <RailItem label={unreadCount ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'} onClick={onNotifications}>
            <Bell className="size-6" strokeWidth={1.75} />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
            ) : null}
          </RailItem>
        ) : null}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1">
        {isGuest ? (
          <>
            <RailItem label="Crear cuenta" onClick={signOut}>
              <UserPlus className="size-6" strokeWidth={1.75} />
            </RailItem>
            <RailItem label="Salir" onClick={signOut}>
              <LogOut className="size-6" strokeWidth={1.75} />
            </RailItem>
          </>
        ) : (
          <RailItem label="Configuración y actividad" onClick={onSettings} haspopup>
            <Menu className="size-6" strokeWidth={1.75} />
          </RailItem>
        )}
        <span className="group relative mt-3 flex size-8 items-center justify-center" tabIndex={0} aria-label={`${name} · ${roleLabel}`}>
          <span className={cn('size-3 rounded-full', roleClass)} />
          <span role="tooltip" className={tooltip}>
            {name} · {roleLabel}
          </span>
        </span>
      </div>
    </aside>
  )
}
