'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, LogOut, Menu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/lib/auth-store'
import { BrandLogo, BrandMark } from '@/components/brand-logo'
import type { MainTab } from '@/components/app/nav'
import { cn } from '@/lib/utils'

type Tab = { id: MainTab; label: string; icon: LucideIcon }

const MIN = 72
const MAX = 360
const DEFAULT = 256
/** Below this width only the icons fit. */
const COMPACT = 160
const STORAGE_KEY = 'boostsport:sidebar-width'

function readWidth() {
  try {
    const v = Number(window.localStorage.getItem(STORAGE_KEY))
    return v >= MIN && v <= MAX ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

/** Width the person dragged the sidebar to, remembered in this browser. */
function useSidebarWidth() {
  const [width, setWidth] = useState(DEFAULT)
  useEffect(() => setWidth(readWidth()), [])
  const save = useCallback((w: number) => {
    setWidth(w)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(w))
    } catch {
      // Private mode or blocked storage: the width just isn't remembered.
    }
  }, [])
  return [width, save] as const
}

/**
 * Left navigation for computers (md and up). Phones keep the top header and the bottom
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
  const [width, setWidth] = useSidebarWidth()
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; w: number } | null>(null)
  const compact = width < COMPACT
  const item = cn('flex w-full items-center gap-4 rounded-xl py-3 text-[15px] transition-colors hover:bg-secondary', compact ? 'justify-center px-0' : 'px-3')

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, w: width }
    setDragging(true)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return
    setWidth(Math.round(Math.min(MAX, Math.max(MIN, start.current.w + e.clientX - start.current.x))))
  }
  function onPointerUp() {
    start.current = null
    setDragging(false)
  }

  return (
    <aside
      style={{ width }}
      className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-background py-6 md:flex', compact ? 'px-2' : 'px-3', dragging && 'select-none')}
    >
      <div className={cn('pb-8', compact ? 'flex justify-center' : 'px-3')}>
        {compact ? <BrandMark /> : <BrandLogo className="h-8 rounded-md" />}
      </div>

      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} type="button" onClick={() => onTab(id)} aria-current={on ? 'page' : undefined} aria-label={label} title={compact ? label : undefined} className={cn(item, on ? 'bg-secondary font-bold' : 'font-medium')}>
              <Icon className={cn('size-6 shrink-0', id === 'match' && 'text-olympic-blue')} strokeWidth={on ? 2.5 : 1.75} />
              {compact ? null : label}
            </button>
          )
        })}
        {!isGuest ? (
          <button type="button" onClick={onNotifications} aria-label="Notificaciones" title={compact ? 'Notificaciones' : undefined} className={cn(item, 'font-medium')}>
            <span className="relative">
              <Bell className="size-6" strokeWidth={1.75} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
              ) : null}
            </span>
            {compact ? null : 'Notificaciones'}
          </button>
        ) : null}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {isGuest ? (
          <>
            {compact ? null : (
              <button type="button" onClick={signOut} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                Crear cuenta
              </button>
            )}
            <button type="button" onClick={signOut} aria-label="Salir" title={compact ? 'Salir' : undefined} className={cn(item, 'font-medium')}>
              <LogOut className="size-6" strokeWidth={1.75} />
              {compact ? null : 'Salir'}
            </button>
          </>
        ) : (
          <button type="button" onClick={onSettings} aria-haspopup="dialog" aria-label="Configuración" title={compact ? 'Configuración' : undefined} className={cn(item, 'font-medium')}>
            <Menu className="size-6" strokeWidth={1.75} />
            {compact ? null : 'Configuración'}
          </button>
        )}
        {compact ? (
          <span title={`${name} · ${roleLabel}`} className={cn('mx-auto mt-3 size-3 rounded-full', roleClass)} />
        ) : (
          <div className="flex items-center gap-3 border-t border-border px-3 pt-4">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
            <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', roleClass)}>{roleLabel}</span>
          </div>
        )}
      </div>

      {/* Drag to resize; double click to go back to the default width. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Cambiar el ancho de la barra lateral"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setWidth(DEFAULT)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setWidth(Math.max(MIN, width - 16))
          if (e.key === 'ArrowRight') setWidth(Math.min(MAX, width + 16))
        }}
        className={cn(
          'absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize outline-none transition-colors hover:bg-olympic-blue/40 focus-visible:bg-olympic-blue/60',
          dragging && 'bg-olympic-blue/60',
        )}
      />
    </aside>
  )
}
