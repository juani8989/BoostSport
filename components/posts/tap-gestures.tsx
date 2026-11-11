'use client'

import { useCallback, useRef, useState } from 'react'
import { Heart } from 'lucide-react'

/** Time between the two taps of a double tap. */
const DOUBLE_TAP_MS = 320
/** Holding the second tap this long turns it into "Apoyar". */
const HOLD_MS = 450
/** Moving more than this cancels the gesture (it's a scroll or a drag). */
const SLOP_PX = 12

const ignored = (target: EventTarget | null) => !!(target as HTMLElement | null)?.closest('button, a, input, textarea, [role="dialog"]')

/**
 * Double tap → onDoubleTap; double tap keeping the second tap pressed → onHold.
 * Works with fingers and the mouse; two fingers (pinch) or moving cancel it.
 */
export function useTapGestures({ onDoubleTap, onHold }: { onDoubleTap: (x: number, y: number) => void; onHold: (x: number, y: number) => void }) {
  const st = useRef({ last: 0, second: false, moved: false, x: 0, y: 0, timer: 0 as ReturnType<typeof setTimeout> | 0, pointers: new Set<number>() })

  const reset = () => {
    const s = st.current
    if (s.timer) clearTimeout(s.timer)
    s.timer = 0
    s.second = false
  }

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (ignored(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return
    const s = st.current
    s.pointers.add(e.pointerId)
    if (s.pointers.size > 1) {
      reset()
      s.last = 0
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    s.x = e.clientX - rect.left
    s.y = e.clientY - rect.top
    s.moved = false
    const now = performance.now()
    if (now - s.last < DOUBLE_TAP_MS) {
      s.second = true
      s.last = 0
      const { x, y } = s
      s.timer = setTimeout(() => {
        s.timer = 0
        s.second = false
        onHold(x, y)
      }, HOLD_MS)
    } else {
      reset()
      s.last = now
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current
    if (!s.pointers.has(e.pointerId)) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (Math.hypot(e.clientX - rect.left - s.x, e.clientY - rect.top - s.y) > SLOP_PX) {
      s.moved = true
      s.last = 0
      reset()
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current
    s.pointers.delete(e.pointerId)
    if (s.second && s.timer && !s.moved) {
      reset()
      onDoubleTap(s.x, s.y)
    }
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    st.current.pointers.delete(e.pointerId)
    st.current.last = 0
    reset()
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}

/** Big hearts that pop where the person double-tapped. */
export function useHeartBursts() {
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const pop = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setHearts((h) => [...h, { id, x, y }])
    setTimeout(() => setHearts((h) => h.filter((v) => v.id !== id)), 900)
  }, [])
  const node = (
    <>
      {hearts.map((h) => (
        <span key={h.id} aria-hidden className="animate-heart-pop pointer-events-none absolute z-40" style={{ left: h.x, top: h.y }}>
          <Heart className="size-28 fill-olympic-red text-olympic-red drop-shadow-2xl" />
        </span>
      ))}
    </>
  )
  return [node, pop] as const
}
