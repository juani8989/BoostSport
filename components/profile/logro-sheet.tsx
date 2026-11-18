'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Medal, TrendingUp, X } from 'lucide-react'
import { addVitrinaItem, type NewVitrinaItem } from '@/app/actions/vitrina'
import { Sheet, compressImage } from '@/components/app/kit'
import { storeMedia } from '@/lib/upload'
import { cn } from '@/lib/utils'

const MEDALS = [
  { id: 'Oro', className: 'bg-olympic-yellow text-olympic-black' },
  { id: 'Plata', className: 'bg-zinc-300 text-zinc-900' },
  { id: 'Bronce', className: 'bg-amber-700 text-white' },
] as const

const input = 'w-full rounded-xl border border-border bg-background px-3.5 py-3 text-base outline-none focus:border-olympic-blue'

/** Form to add a medal or a personal best to the athlete's Vitrina. */
export function LogroSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<'medalla' | 'marca'>('medalla')
  const [title, setTitle] = useState('')
  const [event, setEvent] = useState('')
  const [medal, setMedal] = useState<'Oro' | 'Plata' | 'Bronce'>('Oro')
  const [metric, setMetric] = useState('')
  const [value, setValue] = useState('')
  const [previous, setPrevious] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Elegí una imagen.')
    setUploading(true)
    try {
      setImage(await storeMedia('post-image', await compressImage(file)))
      setError(null)
    } catch {
      setError('No pudimos subir la foto. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload: NewVitrinaItem = type === 'medalla' ? { type, title, event, medal, image } : { type, metric, value, previous, event, image }
    setPending(true)
    const res = await addVitrinaItem(payload)
    setPending(false)
    if (!res.ok) return setError(res.error)
    onAdded()
    onClose()
  }

  return (
    <Sheet title="Sumar a la Vitrina" onClose={onClose}>
      <form onSubmit={save} onChange={() => error && setError(null)} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">Lo que subas acá lo ven los sponsors y las instituciones en la Vitrina.</p>

        <div role="radiogroup" aria-label="Tipo de logro" className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'medalla', label: 'Medalla', icon: Medal },
              { id: 'marca', label: 'Marca personal', icon: TrendingUp },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={type === o.id}
              onClick={() => (setType(o.id), setError(null))}
              className={cn('flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-bold', type === o.id ? 'border-olympic-blue bg-olympic-blue/10' : 'border-border')}
            >
              <o.icon className="size-4" />
              {o.label}
            </button>
          ))}
        </div>

        {type === 'medalla' ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              ¿Qué ganaste?
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campeón nacional de kumite -67 kg" maxLength={90} className={input} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              ¿En qué competencia?
              <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Nacional de Karate · Córdoba 2026" maxLength={90} className={input} />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="pb-1.5 text-sm font-semibold">Medalla</legend>
              <div className="flex gap-2">
                {MEDALS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={medal === m.id}
                    onClick={() => setMedal(m.id)}
                    className={cn('flex-1 rounded-full py-2.5 text-sm font-bold transition-opacity', m.className, medal === m.id ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'opacity-50')}
                  >
                    {m.id}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              ¿En qué es la marca?
              <input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="400 m llanos" maxLength={60} className={input} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Nueva marca
                <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="52,3 s" maxLength={30} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Antes <span className="sr-only">(opcional)</span>
                <input value={previous} onChange={(e) => setPrevious(e.target.value)} placeholder="53,1 s" maxLength={30} className={input} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              ¿Dónde? <span className="text-xs font-normal text-muted-foreground">Opcional</span>
              <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Torneo Apertura · Rosario" maxLength={90} className={input} />
            </label>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">
            Foto <span className="text-xs font-normal text-muted-foreground">Opcional; si no, usamos la de tu perfil</span>
          </span>
          {image ? (
            <div className="relative overflow-hidden rounded-xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Vista previa" className="max-h-56 w-full object-contain" />
              <button type="button" onClick={() => setImage(null)} aria-label="Quitar foto" className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-background/80">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm font-semibold text-muted-foreground">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploading ? 'Subiendo…' : 'Elegir foto'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
        </div>

        {error ? (
          <p role="alert" className="text-sm font-semibold text-olympic-red">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending || uploading} className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue py-3.5 font-bold text-olympic-white disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Publicar en la Vitrina
        </button>
      </form>
    </Sheet>
  )
}
