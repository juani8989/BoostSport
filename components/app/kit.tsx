'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import type { Party } from '@/lib/viewer'
import { cn } from '@/lib/utils'
import { thumbOf } from '@/lib/image-variants'

const roleRing: Record<Party['role'], string> = {
  deportista: 'ring-olympic-blue',
  empresa: 'ring-olympic-yellow',
  evento: 'ring-olympic-green',
}

export function PartyAvatar({ party, className }: { party: Pick<Party, 'name' | 'image' | 'initials' | 'role'>; className?: string }) {
  // A photo that fails to load (deleted file, bad link) falls back to the initials.
  const [broken, setBroken] = useState<string | null>(null)
  const image = party.image && party.image !== broken ? party.image : undefined
  return (
    <span className={cn('relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-sm font-semibold ring-2', roleRing[party.role], className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={thumbOf(image)} alt="" onError={() => setBroken(image)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden>{party.initials}</span>
      )}
    </span>
  )
}

/**
 * A screen of its own over the app (back arrow, title, scrollable content), or with
 * `modal`, a sheet that slides up over a dimmed background for quick actions.
 */
export function Sheet({ title, onClose, children, action, modal }: { title: string; onClose: () => void; children: React.ReactNode; tall?: boolean; action?: React.ReactNode; modal?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (modal) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-6">
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/50 animate-in fade-in duration-200 motion-reduce:animate-none" />
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative flex max-h-[88%] w-full flex-col rounded-t-3xl border-t border-border bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom-8 duration-200 motion-reduce:animate-none md:max-w-md md:rounded-3xl md:border"
        >
          <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/40 md:hidden" />
          <header className="flex items-center justify-between gap-2 px-5 pb-3 pt-3">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 items-center justify-center rounded-full bg-secondary">
              <X className="size-4" />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">{children}</div>
        </section>
      </div>
    )
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-50 flex flex-col bg-background text-foreground animate-in slide-in-from-right-8 fade-in duration-200 motion-reduce:animate-none"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 pb-3 pt-5">
        <button type="button" onClick={onClose} aria-label="Volver" className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</h2>
        {action ? <div className="shrink-0 pr-2">{action}</div> : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 pb-8">{children}</div>
    </section>
  )
}

export function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} d`
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function compressImage(file: File, maxSide = 1080, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

export function isComposing(e: React.KeyboardEvent) {
  return e.nativeEvent.isComposing || e.keyCode === 229
}

/** Placeholder for a full-screen feed post while it loads: the shapes of a post, gently pulsing. */
export function FeedSkeleton({ label = 'Cargando publicaciones' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="relative h-full w-full shrink-0 snap-start overflow-hidden bg-secondary/40">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-background via-secondary/30 to-secondary/60 motion-reduce:animate-none" />
      <div className="relative flex h-full items-end gap-3 px-4 pb-24 pt-36 md:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:max-w-md">
          <div className="flex items-center gap-2">
            <span className="size-9 animate-pulse rounded-full bg-muted-foreground/25" />
            <span className="flex flex-col gap-1.5">
              <span className="h-3 w-28 animate-pulse rounded-full bg-muted-foreground/25" />
              <span className="h-2.5 w-40 animate-pulse rounded-full bg-muted-foreground/20" />
            </span>
          </div>
          <span className="h-5 w-16 animate-pulse rounded-full bg-muted-foreground/25" />
          <span className="h-3 w-full animate-pulse rounded-full bg-muted-foreground/20" />
          <span className="h-3 w-4/5 animate-pulse rounded-full bg-muted-foreground/20" />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-4 md:hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="size-11 animate-pulse rounded-full bg-muted-foreground/20" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
