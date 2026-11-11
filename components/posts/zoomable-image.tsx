'use client'

import { useRef, useState } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = { scale: number; x: number; y: number }
const MAX = 4

/** Image with pinch zoom, double-tap zoom and drag to pan while zoomed. */
export function ZoomableImage({ src, alt, className, eager, hideButton }: { src: string; alt: string; className?: string; eager?: boolean; hideButton?: boolean }) {
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const gesture = useRef<{ dist?: number; scale: number; px?: number; py?: number; x: number; y: number; lastTap?: number }>({ scale: 1, x: 0, y: 0 })
  const zoomed = view.scale > 1.01

  const clamp = (v: View): View => {
    const scale = Math.min(MAX, Math.max(1, v.scale))
    if (scale === 1) return { scale: 1, x: 0, y: 0 }
    const limit = ((scale - 1) / scale) * 220
    return { scale, x: Math.max(-limit, Math.min(limit, v.x)), y: Math.max(-limit, Math.min(limit, v.y)) }
  }

  function toggleAt(clientX: number, clientY: number, rect: DOMRect) {
    if (zoomed) return setView({ scale: 1, x: 0, y: 0 })
    const scale = 2.5
    const x = ((rect.left + rect.width / 2 - clientX) / scale) * (scale - 1)
    const y = ((rect.top + rect.height / 2 - clientY) / scale) * (scale - 1)
    setView(clamp({ scale, x, y }))
  }

  function onTouchStart(e: React.TouchEvent) {
    const g = gesture.current
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      g.dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      g.scale = view.scale
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      const now = Date.now()
      if (g.lastTap && now - g.lastTap < 280) {
        toggleAt(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect())
        g.lastTap = undefined
        return
      }
      g.lastTap = now
      g.px = t.clientX
      g.py = t.clientY
      g.x = view.x
      g.y = view.y
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current
    if (e.touches.length === 2 && g.dist) {
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      setView((v) => clamp({ ...v, scale: g.scale * (dist / g.dist!) }))
    } else if (e.touches.length === 1 && zoomed && g.px !== undefined && g.py !== undefined) {
      const t = e.touches[0]
      setView((v) => clamp({ ...v, x: g.x + (t.clientX - g.px!) / v.scale, y: g.y + (t.clientY - g.py!) / v.scale }))
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) gesture.current.dist = undefined
  }

  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !zoomed) return
    setView((v) => clamp({ ...v, scale: v.scale * (e.deltaY < 0 ? 1.15 : 0.87) }))
  }

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden', zoomed && 'touch-none')}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={(e) => toggleAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())}
      onWheel={onWheel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={cn('size-full select-none object-contain transition-transform duration-150 ease-out', className)}
        style={{ transform: `scale(${view.scale}) translate(${view.x}px, ${view.y}px)` }}
      />
      {hideButton && !zoomed ? null : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setView(zoomed ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 })
        }}
        aria-label={zoomed ? 'Alejar' : 'Acercar'}
        className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur"
      >
        {zoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
      </button>
      )}
    </div>
  )
}
