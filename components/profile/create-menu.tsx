'use client'

import { useEffect, useRef, useState } from 'react'
import { Lightbulb, Newspaper, Plus, Sun, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DailyKind } from '@/lib/catalog'
import { cn } from '@/lib/utils'

const OPTIONS: { kind: DailyKind | 'prensa'; label: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { kind: 'diario', label: 'Publicación', hint: 'Tu día, un entrenamiento o una competencia', icon: Sun, tone: 'text-olympic-blue' },
  { kind: 'meta', label: 'Meta', hint: 'Algo que querés lograr', icon: Target, tone: 'text-olympic-red' },
  { kind: 'idea', label: 'Idea', hint: 'Un proyecto o algo que se te ocurrió', icon: Lightbulb, tone: 'text-olympic-yellow' },
  { kind: 'colab', label: 'Colab', hint: 'Buscá con quién entrenar o trabajar', icon: Users, tone: 'text-olympic-green' },
  { kind: 'prensa', label: 'Nota o entrevista', hint: 'Sumá un link donde aparecés', icon: Newspaper, tone: 'text-foreground' },
]

/** The + on the athlete's own profile: a dropdown of what they can create. */
export function CreateMenu({ onCompose, onAddPress }: { onCompose: (kind: DailyKind) => void; onAddPress: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
      <div ref={ref} className="absolute left-4 top-16 z-20 text-left">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Crear"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn('flex size-10 items-center justify-center rounded-xl border-2 border-foreground transition-transform', open && 'rotate-45')}
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
        {open ? (
          <div role="menu" aria-label="Crear" className="absolute left-0 top-12 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 motion-reduce:animate-none">
            <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crear</p>
            {OPTIONS.map((o) => (
              <button
                key={o.kind}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  if (o.kind === 'prensa') onAddPress()
                  else onCompose(o.kind)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
              >
                <o.icon className={cn('size-5 shrink-0', o.tone)} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">{o.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
  )
}
