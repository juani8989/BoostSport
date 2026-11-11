'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Up/down buttons to move between posts in a vertical snap feed. Computers only (md and
 * up): phones swipe. The ↑ ↓ keys do the same while nothing else has focus.
 */
export function FeedArrows({ target, className }: { target: React.RefObject<HTMLElement | null>; className?: string }) {
  const [edge, setEdge] = useState({ top: true, bottom: false })

  const update = useCallback(() => {
    const el = target.current
    if (!el) return
    setEdge({ top: el.scrollTop <= 4, bottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 4 })
  }, [target])

  const move = useCallback(
    (dir: 1 | -1) => {
      const el = target.current
      if (!el) return
      el.scrollBy({ top: dir * el.clientHeight, behavior: 'smooth' })
    },
    [target],
  )

  useEffect(() => {
    const el = target.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: false })
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
      mo.disconnect()
    }
  }, [target, update])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (!window.matchMedia('(min-width: 768px)').matches) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      const el = target.current
      if (!el || el.offsetParent === null) return
      // Only the feed on top reacts: a feed behind the post viewer (or under any open sheet) stays still.
      const dialogs = document.querySelectorAll('[role="dialog"]')
      const top = dialogs[dialogs.length - 1]
      if (top ? !top.contains(el) : false) return
      e.preventDefault()
      move(e.key === 'ArrowDown' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, target])

  const button = 'flex size-11 items-center justify-center rounded-full bg-background/70 text-foreground shadow-lg backdrop-blur transition-opacity hover:bg-background disabled:pointer-events-none disabled:opacity-0'

  return (
    <div className={cn('pointer-events-none absolute z-20 hidden flex-col gap-2 md:flex', className)}>
      <button type="button" onClick={() => move(-1)} disabled={edge.top} aria-label="Publicación anterior" title="Anterior (↑)" className={cn(button, 'pointer-events-auto')}>
        <ChevronUp className="size-6" />
      </button>
      <button type="button" onClick={() => move(1)} disabled={edge.bottom} aria-label="Publicación siguiente" title="Siguiente (↓)" className={cn(button, 'pointer-events-auto')}>
        <ChevronDown className="size-6" />
      </button>
    </div>
  )
}
