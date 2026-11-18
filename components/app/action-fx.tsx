'use client'

import { useEffect, useRef, useState } from 'react'
import { compactNumber } from '@/components/app/kit'
import { cn } from '@/lib/utils'

/**
 * How the icon moves: `pop` (like, apoyar, seguir), `drop` (guardar), `wiggle`, `fly`
 * (compartir) or `tap` (comentar and anything else).
 */
export type FxVariant = 'pop' | 'drop' | 'wiggle' | 'fly' | 'tap'

type Fx = { id: number; kind: 'on' | 'off' | 'tap' }

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + Math.PI / 8
  const dist = i % 2 ? 20 : 26
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist }
})

const onClass: Record<FxVariant, string> = {
  pop: 'animate-fx-pop',
  drop: 'animate-fx-drop',
  wiggle: 'animate-fx-wiggle',
  fly: 'animate-fx-fly',
  tap: 'animate-fx-tap',
}

/**
 * Wraps an action's icon and animates it. For toggles, pass `active`: turning on pops it
 * with a ring and sparks in the current color, turning off gives a small squeeze. For plain
 * actions (comentar, compartir), bump `tap` on each press.
 * Only real changes animate, never the first render.
 */
export function FxIcon({ active, tap = 0, variant = 'pop', sparks = true, className, children }: { active?: boolean; tap?: number; variant?: FxVariant; sparks?: boolean; className?: string; children: React.ReactNode }) {
  const [fx, setFx] = useState<Fx | null>(null)
  const prevActive = useRef(active)
  const prevTap = useRef(tap)

  useEffect(() => {
    if (active !== undefined && prevActive.current !== undefined && active !== prevActive.current) {
      setFx({ id: Date.now(), kind: active ? 'on' : 'off' })
      // A short buzz on phones that support it (Android); iPhones ignore it.
      if (active) buzz(variant === 'pop' ? [12, 40, 18] : 12)
    }
    prevActive.current = active
  }, [active, variant])

  useEffect(() => {
    if (tap !== prevTap.current) setFx({ id: Date.now(), kind: 'tap' })
    prevTap.current = tap
  }, [tap])

  const animation = !fx ? undefined : fx.kind === 'off' ? 'animate-fx-off' : onClass[variant]
  const burst = fx?.kind === 'on' && sparks

  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <span key={fx?.id ?? 0} className={cn('inline-flex', animation)}>
        {children}
      </span>
      {burst ? (
        <span key={`b${fx.id}`} aria-hidden className="pointer-events-none absolute inset-0">
          <span className="animate-fx-ring absolute -inset-1.5 rounded-full border-2 border-current" />
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="animate-fx-spark absolute left-1/2 top-1/2 size-1.5 rounded-full bg-current"
              style={{ ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px`, animationDelay: `${(i % 3) * 30}ms` }}
            />
          ))}
        </span>
      ) : null}
    </span>
  )
}

function buzz(pattern: number | number[]) {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate?.(pattern)
  } catch {}
}

/** A number that rolls up when it grows and down when it shrinks. */
export function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const prev = useRef(value)
  const [dir, setDir] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (value !== prev.current) setDir(value > prev.current ? 'up' : 'down')
    prev.current = value
  }, [value])
  return (
    <span className={cn('inline-flex overflow-hidden', className)}>
      <span key={value} className={cn('inline-block tabular-nums', dir === 'up' && 'animate-fx-count-up', dir === 'down' && 'animate-fx-count-down')}>
        {compactNumber(value)}
      </span>
    </span>
  )
}

/** Counter for plain actions: call `bump()` in the click handler and pass `tap` to FxIcon. */
export function useTap() {
  const [tap, setTap] = useState(0)
  return [tap, () => setTap((t) => t + 1)] as const
}
