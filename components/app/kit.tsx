'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Party } from '@/lib/viewer'
import { cn } from '@/lib/utils'

const roleRing: Record<Party['role'], string> = {
  deportista: 'ring-olympic-blue',
  empresa: 'ring-olympic-yellow',
  evento: 'ring-olympic-green',
}

export function PartyAvatar({ party, className }: { party: Pick<Party, 'name' | 'image' | 'initials' | 'role'>; className?: string }) {
  return (
    <span className={cn('relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-sm font-semibold ring-2', roleRing[party.role], className)}>
      {party.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={party.image} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden>{party.initials}</span>
      )}
    </span>
  )
}

export function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-olympic-black/60" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative flex max-h-[88%] flex-col rounded-t-3xl border-t border-border bg-card text-card-foreground', tall && 'h-[88%]')}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 items-center justify-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">{children}</div>
      </section>
    </div>
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
