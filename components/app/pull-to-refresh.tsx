'use client'

import { useEffect, useState } from 'react'
import { mutate } from 'swr'
import { ArrowDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TRIGGER = 70
const MAX = 110

/**
 * Pull down from the top of a feed to reload it (touch screens). Revalidates everything the
 * screen loaded, so new posts, counts and the Vitrina all come in fresh.
 */
export function PullToRefresh({ target, className }: { target: React.RefObject<HTMLElement | null>; className?: string }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = target.current
    if (!el) return
    let startY: number | null = null
    let current = 0

    const onStart = (e: TouchEvent) => {
      startY = el.scrollTop <= 0 && !refreshing ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0 || el.scrollTop > 0) {
        current = 0
        setPull(0)
        return
      }
      // Resistance: the further you pull, the slower it follows.
      current = Math.min(MAX, dy * 0.5)
      setPull(current)
      if (e.cancelable) e.preventDefault()
    }
    const onEnd = async () => {
      if (startY === null) return
      startY = null
      if (current >= TRIGGER) {
        setRefreshing(true)
        setPull(TRIGGER)
        navigator.vibrate?.(10)
        await Promise.all([mutate(() => true), new Promise((r) => setTimeout(r, 600))])
        setRefreshing(false)
      }
      current = 0
      setPull(0)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [target, refreshing])

  if (!pull && !refreshing) return null
  const ready = pull >= TRIGGER
  return (
    <div
      aria-live="polite"
      className={cn('pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center', !pull && 'transition-transform')}
      style={{ transform: `translateY(${pull + 24}px)` }}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur">
        {refreshing ? (
          <Loader2 aria-label="Actualizando" className="size-5 animate-spin text-olympic-blue" />
        ) : (
          <ArrowDown aria-label={ready ? 'Soltá para actualizar' : 'Tirá para actualizar'} className={cn('size-5 transition-transform', ready && 'rotate-180 text-olympic-blue')} style={{ opacity: Math.min(1, pull / TRIGGER) }} />
        )}
      </span>
    </div>
  )
}
