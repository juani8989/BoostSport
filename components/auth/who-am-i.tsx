'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowRight, Eye } from 'lucide-react'
import { enterAsGuest, type Role } from '@/lib/auth-store'
import { landingPhotos as panelImages } from '@/lib/landing-photos'
import { roleConfig } from '@/lib/roles'
import { BrandLine } from '@/components/brand-logo'
import { cn } from '@/lib/utils'

function OlympicRings({ className }: { className?: string }) {
  const rings = [
    { cx: 60, cy: 60, color: 'var(--color-olympic-blue)' },
    { cx: 190, cy: 60, color: 'var(--color-olympic-white)' },
    { cx: 320, cy: 60, color: 'var(--color-olympic-red)' },
    { cx: 125, cy: 120, color: 'var(--color-olympic-yellow)' },
    { cx: 255, cy: 120, color: 'var(--color-olympic-green)' },
  ]
  return (
    <svg viewBox="0 0 380 185" aria-hidden className={className}>
      {rings.map((r) => (
        <circle key={r.cx} cx={r.cx} cy={r.cy} r={52} fill="none" stroke={r.color} strokeWidth={11} />
      ))}
    </svg>
  )
}

const loadAuthPanel = () => import('@/components/auth/auth-panel')
const AuthPanel = dynamic(() => loadAuthPanel().then((m) => m.AuthPanel))

const roleOrder: Role[] = ['deportista', 'empresa', 'evento']

const photoAt = (role: Role, index: number) => panelImages[role][index % panelImages[role].length]

function RoleBackdrop({
  active,
  photoIndex,
  seen,
}: {
  active: Role | null
  photoIndex: Record<Role, number>
  seen: Set<string>
}) {
  const current = active ? photoAt(active, photoIndex[active]) : null
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
      {roleOrder.flatMap((role) =>
        panelImages[role].map((image, i) => {
          const isActive = active === role && photoIndex[role] % panelImages[role].length === i
          // Solo se montan las fotos ya vistas y la próxima de cada rol, para no bajar todas de entrada.
          if (!seen.has(image.src) && image !== photoAt(role, photoIndex[role] + 1)) return null
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.src}
              src={image.src}
              alt=""
              className={cn(
                'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 ease-out',
                image.position,
                isActive ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
              )}
            />
          )
        }),
      )}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-olympic-black via-olympic-black/50 to-olympic-black/30 transition-opacity duration-700',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      {current?.caption ? (
        <p
          key={current.src}
          className="absolute right-4 top-16 max-w-[60vw] text-right text-xs text-olympic-white/80 animate-in fade-in duration-700 md:right-6 md:top-6"
        >
          <span className="font-semibold">{current.caption}</span>
          {current.credit ? <span className="block text-[10px] text-olympic-white/50">Foto: {current.credit} · Wikimedia Commons</span> : null}
        </p>
      ) : null}
    </div>
  )
}

function RolePanel({
  role,
  onSelect,
  onActivate,
}: {
  role: Role
  onSelect: () => void
  onActivate: () => void
}) {
  const config = roleConfig[role]
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className="group relative flex min-h-48 flex-1 flex-col justify-end overflow-hidden border-olympic-white/25 text-left outline-none transition-[flex-grow] duration-500 ease-out max-md:border-t md:border-l md:first:border-l-0 md:hover:grow-[1.7] md:focus-visible:grow-[1.7]"
    >
      <div className="relative z-10 flex flex-col gap-2 p-5 text-olympic-white md:p-6">
        <span aria-hidden className={cn('h-1.5 w-10 rounded-full transition-all duration-500 md:group-hover:w-16', config.bg)} />
        <span className="font-display text-3xl font-semibold leading-none text-balance md:text-4xl">{config.label}</span>
        <span className="text-sm opacity-80 text-pretty">{config.tagline}</span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold">
          Ingresar <ArrowRight className="size-4 transition-transform md:group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  )
}

export function WhoAmI() {
  const [selected, setSelected] = useState<Role | null>(null)
  const [hovered, setHovered] = useState<Role | null>(null)
  const [photoIndex, setPhotoIndex] = useState<Record<Role, number>>({ deportista: 0, empresa: 0, evento: 0 })
  const [seen, setSeen] = useState<Set<string>>(() => new Set())

  const activate = (role: Role) => {
    // Hovering a role means a click is likely; have the sign-in form ready.
    loadAuthPanel()
    if (role === hovered) return
    const next = photoIndex[role] + 1
    setHovered(role)
    setPhotoIndex((prev) => ({ ...prev, [role]: next }))
    setSeen((prev) => new Set(prev).add(photoAt(role, next).src))
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-olympic-black text-olympic-white">
      <OlympicRings className="pointer-events-none absolute left-1/2 top-[55%] w-[min(1500px,170vw)] -translate-x-1/2 -translate-y-1/2 opacity-45" />
      <RoleBackdrop active={hovered} photoIndex={photoIndex} seen={seen} />
      <BrandLine className="relative z-30" />
      <header className="pointer-events-none relative z-20 flex flex-col items-center gap-3 px-6 pt-6 text-center md:absolute md:inset-x-0 md:top-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-contorno.svg" alt="BoostSport" width={480} height={140} className="h-24 w-auto md:h-32" />
        <div className="flex flex-col items-center gap-1">
          <p className="eyebrow text-xs text-olympic-white/60">El marketplace del deporte</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{'¿Quién sos?'}</h1>
        </div>
      </header>

      <div
        className="relative z-10 flex flex-1 flex-col pt-8 md:flex-row md:pt-0"
        onMouseLeave={() => setHovered(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null)
        }}
      >
        {roleOrder.map((role) => (
          <RolePanel
            key={role}
            role={role}
            onSelect={() => setSelected(role)}
            onActivate={() => activate(role)}
          />
        ))}
      </div>

      <footer className="relative z-20 flex flex-wrap items-center justify-center gap-3 border-t border-olympic-white/10 bg-olympic-black/80 px-6 py-4 text-sm backdrop-blur">
        <span className="text-olympic-white/60">¿Solo querés mirar?</span>
        <button
          type="button"
          onClick={enterAsGuest}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Eye className="size-4" /> Entrar como invitado
        </button>
      </footer>

      {selected ? <AuthPanel role={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  )
}
