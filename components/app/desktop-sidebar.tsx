'use client'

import { Bell, LogOut, Menu, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/lib/auth-store'
import { RefreshLogo } from '@/components/brand-logo'
import type { MainTab } from '@/components/app/nav'
import { cn } from '@/lib/utils'

type Tab = { id: MainTab; label: string; icon: LucideIcon }

/** Names show beside the icons only where there is room for them (xl and up); the rail never covers the page. */
const reveal = 'hidden min-w-0 truncate whitespace-nowrap pr-4 text-[15px] xl:inline'

function RailItem({ label, ariaLabel, onClick, active, children, haspopup }: { label: string; ariaLabel?: string; onClick: () => void; active?: boolean; children: React.ReactNode; haspopup?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={ariaLabel ?? label}
      aria-current={active ? 'page' : undefined}
      aria-haspopup={haspopup ? 'dialog' : undefined}
      className={cn(
        'flex h-12 w-full items-center overflow-hidden rounded-xl transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none',
        active && 'font-bold',
      )}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center">{children}</span>
      <span aria-hidden className={cn(reveal, active ? 'font-bold' : 'font-medium')}>
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
  meName,
  meAvatar,
  unreadCount,
  onNotifications,
  onSettings,
}: {
  tabs: Tab[]
  active: MainTab | null
  onTab: (tab: MainTab) => void
  isGuest: boolean
  meName: string
  meAvatar: React.ReactNode
  unreadCount: number
  onNotifications: () => void
  onSettings: () => void
}) {
  return (
    // Icons only on medium screens, icons and names on wide ones. It takes its own space,
    // so opening it never puts anything on top of the page.
    <aside className="sticky top-0 z-[60] hidden h-dvh w-[72px] shrink-0 flex-col border-r border-border bg-background px-3 py-6 md:flex xl:w-60">
      <div className="flex items-center pb-8">
        <RefreshLogo compact className="size-12 shrink-0" />
        <span aria-hidden className={cn(reveal, 'pl-2 font-display text-xl font-semibold')}>
          BoostSport
        </span>
      </div>

      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <RailItem key={id} label={id === 'perfil' ? meName : label} active={active === id} onClick={() => onTab(id)}>
            {id === 'perfil' ? meAvatar : <Icon className={cn('size-6', id === 'match' && 'text-olympic-blue')} strokeWidth={active === id ? 2.5 : 1.75} />}
          </RailItem>
        ))}
        {!isGuest ? (
          <RailItem label="Notificaciones" ariaLabel={unreadCount ? `Notificaciones, ${unreadCount} sin leer` : undefined} onClick={onNotifications}>
            <Bell className="size-6" strokeWidth={1.75} />
            {unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
            ) : null}
          </RailItem>
        ) : null}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
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
          <RailItem label="Configuración" onClick={onSettings} haspopup>
            <Menu className="size-6" strokeWidth={1.75} />
          </RailItem>
        )}
      </div>
    </aside>
  )
}
