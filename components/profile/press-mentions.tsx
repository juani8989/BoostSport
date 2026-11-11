'use client'

import { useState } from 'react'
import { EyeOff, ExternalLink, Link2, Loader2, Mic, Newspaper, Plus, Radio, Trash2, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { addPressLink, hideNewsItem, previewPressLink, removePressLink } from '@/app/actions/athlete'
import type { PressKind, PressLink } from '@/lib/profile-types'
import { Sheet } from '@/components/app/kit'
import { cn } from '@/lib/utils'

export const pressKindMeta: Record<PressKind, { label: string; icon: LucideIcon; className: string }> = {
  noticia: { label: 'Noticia', icon: Newspaper, className: 'bg-olympic-blue text-olympic-white' },
  entrevista: { label: 'Entrevista', icon: Mic, className: 'bg-olympic-red text-olympic-white' },
  video: { label: 'Video', icon: Video, className: 'bg-olympic-yellow text-olympic-black' },
  podcast: { label: 'Podcast', icon: Radio, className: 'bg-olympic-green text-olympic-white' },
  link: { label: 'Link', icon: Link2, className: 'bg-secondary text-foreground' },
}

const dateOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function PressCard({ item, action }: { item: PressLink; action?: React.ReactNode }) {
  const meta = pressKindMeta[item.kind]
  return (
    <li className="flex gap-3 rounded-xl bg-card p-2.5">
      <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 flex-1 gap-3">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className={cn('flex size-20 shrink-0 items-center justify-center rounded-lg', meta.className)}>
            <meta.icon className="size-7" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn('self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', meta.className)}>{meta.label}</span>
          <span className="line-clamp-3 text-sm font-semibold leading-snug">{item.title}</span>
          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {item.source}
            {item.date ? ` · ${dateOf(item.date)}` : ''}
            <ExternalLink className="size-3 shrink-0" />
          </span>
        </span>
      </a>
      {action}
    </li>
  )
}

export function PressMentions({ press, news, isMe, onChanged }: { press: PressLink[]; news: PressLink[]; isMe: boolean; onChanged: () => void }) {
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<PressKind | 'todo'>('todo')
  const all = [...press, ...news]
  const kinds = (Object.keys(pressKindMeta) as PressKind[]).filter((k) => all.some((i) => i.kind === k))
  const show = (list: PressLink[]) => list.filter((i) => filter === 'todo' || i.kind === filter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Noticias, entrevistas y links</h2>
        {isMe ? (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full bg-olympic-blue px-3 py-1.5 text-xs font-bold text-olympic-white">
            <Plus className="size-3.5" />
            Agregar
          </button>
        ) : null}
      </div>

      {kinds.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(['todo', ...kinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', filter === k ? 'bg-foreground text-background' : 'bg-secondary')}
            >
              {k === 'todo' ? 'Todo' : pressKindMeta[k].label}
            </button>
          ))}
        </div>
      ) : null}

      {!all.length ? (
        <p className="rounded-xl bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          {isMe ? 'Sumá las notas, entrevistas y videos donde aparecés: pegá el link y nosotros completamos el resto.' : 'Todavía no hay notas cargadas.'}
        </p>
      ) : null}

      {show(press).length ? (
        <ul className="flex flex-col gap-2">
          {show(press).map((item) => (
            <PressCard
              key={item.url}
              item={item}
              action={
                isMe ? (
                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={async () => {
                      await removePressLink(item.url)
                      onChanged()
                    }}
                    className="flex size-8 shrink-0 items-center justify-center self-start rounded-full bg-secondary text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null
              }
            />
          ))}
        </ul>
      ) : null}

      {show(news).length ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Encontradas en Google Noticias</h3>
          <ul className="flex flex-col gap-2">
            {show(news).map((item) => (
              <PressCard
                key={item.url}
                item={item}
                action={
                  isMe ? (
                    <div className="flex shrink-0 flex-col gap-1 self-start">
                      <button
                        type="button"
                        aria-label="Fijar en mi perfil"
                        title="Fijar en mi perfil"
                        onClick={async () => {
                          await addPressLink(item)
                          onChanged()
                        }}
                        className="flex size-8 items-center justify-center rounded-full bg-secondary"
                      >
                        <Plus className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="No soy yo, ocultar"
                        title="No soy yo, ocultar"
                        onClick={async () => {
                          await hideNewsItem(item.url)
                          onChanged()
                        }}
                        className="flex size-8 items-center justify-center rounded-full bg-secondary"
                      >
                        <EyeOff className="size-4" />
                      </button>
                    </div>
                  ) : null
                }
              />
            ))}
          </ul>
          {isMe ? <p className="text-[11px] leading-relaxed text-muted-foreground">Buscamos tu nombre en los medios. Fijá las que son tuyas con + y ocultá las de otra persona con el ojo.</p> : null}
        </section>
      ) : null}

      {adding ? <AddPressSheet onClose={() => setAdding(false)} onAdded={onChanged} /> : null}
    </div>
  )
}

export function AddPressSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [url, setUrl] = useState('')
  const [link, setLink] = useState<PressLink | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function read(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setPending(true)
    setError(null)
    const res = await previewPressLink(url.trim())
    setPending(false)
    if (!res.ok) return setError(res.error)
    setLink(res.link ?? null)
  }

  async function save() {
    if (!link) return
    setPending(true)
    const res = await addPressLink(link)
    setPending(false)
    if (!res.ok) return setError(res.error)
    onAdded()
    onClose()
  }

  const input = 'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm'

  return (
    <Sheet title="Agregar una mención" onClose={onClose}>
      <form onSubmit={read} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Link de la nota, entrevista o video
          <div className="flex gap-2">
            <input value={url} onChange={(e) => (setUrl(e.target.value), setLink(null))} type="url" inputMode="url" placeholder="https://" className={input} />
            <button type="submit" disabled={pending || !url.trim()} className="shrink-0 rounded-xl bg-secondary px-4 text-sm font-bold disabled:opacity-50">
              {pending && !link ? <Loader2 className="size-4 animate-spin" /> : 'Leer'}
            </button>
          </div>
        </label>
      </form>

      {link ? (
        <div className="mt-4 flex flex-col gap-3">
          <PressCard item={link} />
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Título
            <input value={link.title} maxLength={200} onChange={(e) => setLink({ ...link, title: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Medio
            <input value={link.source} maxLength={80} onChange={(e) => setLink({ ...link, source: e.target.value })} className={input} />
          </label>
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">Tipo</legend>
            {(Object.keys(pressKindMeta) as PressKind[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={link.kind === k}
                onClick={() => setLink({ ...link, kind: k })}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', link.kind === k ? pressKindMeta[k].className : 'bg-secondary')}
              >
                {pressKindMeta[k].label}
              </button>
            ))}
          </fieldset>
          <button type="button" onClick={save} disabled={pending} className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white disabled:opacity-50">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Agregar a mis menciones
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </Sheet>
  )
}
