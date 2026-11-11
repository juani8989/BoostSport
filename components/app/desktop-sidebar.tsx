'use client'

import { Bell, LogOut, Menu, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/lib/auth-store'
import { BrandMark } from '@/components/brand-logo'
import type { MainTab } from '@/components/app/nav'
import { cn } from '@/lib/utils'

type Tab = { id: MainTab; label: string; icon: LucideIcon }

/** The label slides out of the button itself, to the right, while the cursor is over it (or it has focus). */
const reveal =
  'max-w-0 overflow-hidden whitespace-nowrap pr-0 text-[15px] font-semibold opacity-0 transition-all duration-200 ease-out group-hover:max-w-56 group-hover:pr-4 group-hover:opacity-100 group-focus-visible:max-w-56 group-focus-visible:pr-4 group-focus-visible:opacity-100 motion-reduce:transition-none'

function RailItem({ label, onClick, active, children, haspopup }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode; haspopup?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      aria-haspopup={haspopup ? 'dialog' : undefined}
      className={cn(
        // w-max lets the button grow past the rail, over the content, as the label opens.
        'group relative z-10 flex h-12 w-max min-w-12 items-center rounded-xl transition-colors hover:z-50 hover:bg-secondary hover:shadow-lg focus-visible:z-50 focus-visible:bg-secondary focus-visible:outline-none',
        active && 'bg-secondary',
      )}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center">{children}</span>
      <span aria-hidden className={reveal}>
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
    <aside className="sticky top-0 z-40 hidden h-dvh w-[72px] shrink-0 flex-col border-r border-border bg-background px-3 py-6 md:flex">
      <div className="flex w-12 justify-center pb-8">
        <BrandMark />
      </div>

      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <RailItem key={id} label={label} active={active === id} onClick={() => onTab(id)}>
            <Icon className={cn('size-6', id === 'match' && 'text-olympic-blue')} strokeWidth={active === id ? 2.5 : 1.75} />
          </RailItem>
        ))}
        {!isGuest ? (
          <RailItem label={unreadCount ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'} onClick={onNotifications}>
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
          <RailItem label="Configuración y actividad" onClick={onSettings} haspopup>
            <Menu className="size-6" strokeWidth={1.75} />
          </RailItem>
        )}
        <span tabIndex={0} aria-label={`${name} · ${roleLabel}`} className="group relative z-10 mt-2 flex h-12 w-max min-w-12 items-center rounded-xl hover:z-50 hover:bg-secondary hover:shadow-lg focus-visible:z-50 focus-visible:bg-secondary focus-visible:outline-none">
          <span className="flex size-12 shrink-0 items-center justify-center">
            <span className={cn('size-3 rounded-full', roleClass)} />
          </span>
          <span aria-hidden className={reveal}>
            {name} · {roleLabel}
          </span>
        </span>
      </div>
    </aside>
  )
}
