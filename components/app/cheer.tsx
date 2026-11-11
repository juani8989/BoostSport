'use client'

import { useCallback, useState } from 'react'

export const CHEERS = [
  '¡SUPER!',
  '¡CREO EN TI!',
  '¡VAMOS!',
  '¡IMPARABLE!',
  '¡A FONDO!',
  '¡FUERZA!',
  '¡SEGUÍ ASÍ!',
  '¡CRACK!',
  '¡CON TODO!',
  '¡TE BANCO!',
  '¡A POR EL ORO!',
  '¡DALE QUE VA!',
  '¡NADA TE FRENA!',
  '¡ORGULLO!',
  '¡TU MOMENTO!',
]

const COLORS = ['#0081c8', '#fcb131', '#00a651', '#ee334e', '#ffffff']

/** Fires a motivational phrase; returns the overlay to render and the function to trigger it. */
export function useCheer() {
  const [burst, setBurst] = useState<{ id: number; text: string } | null>(null)
  const fire = useCallback(() => {
    setBurst((prev) => {
      let text = CHEERS[Math.floor(Math.random() * CHEERS.length)]
      if (text === prev?.text) text = CHEERS[(CHEERS.indexOf(text) + 1) % CHEERS.length]
      return { id: Date.now(), text }
    })
  }, [])
  const node = burst ? <CheerBurst key={burst.id} text={burst.text} onDone={() => setBurst((b) => (b?.id === burst.id ? null : b))} /> : null
  return [node, fire] as const
}

function CheerBurst({ text, onDone }: { text: string; onDone: () => void }) {
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const dist = 70 + (i % 3) * 22
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, color: COLORS[i % COLORS.length], delay: (i % 4) * 40 }
  })
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      {sparks.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="animate-cheer-spark absolute size-2.5 rounded-full"
          style={{ background: s.color, animationDelay: `${s.delay}ms`, ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px` }}
        />
      ))}
      <span
        onAnimationEnd={onDone}
        className="animate-cheer-pop select-none whitespace-nowrap rounded-2xl bg-olympic-yellow px-5 py-2 font-display text-4xl font-black italic tracking-tight text-olympic-black shadow-2xl"
        style={{ textShadow: '0 2px 0 rgba(255,255,255,0.4)' }}
      >
        {text}
      </span>
    </div>
  )
}
