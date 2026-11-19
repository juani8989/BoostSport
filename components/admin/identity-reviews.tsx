'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { BadgeCheck, Bot, ExternalLink, IdCard, Loader2, Medal, ShieldCheck, ShieldX } from 'lucide-react'
import { decideIdentity, listIdentityReviews, type IdentityReview, type IdentityStatus } from '@/app/actions/identity'
import { Button, formatDate, useAdminFeedback } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const tabs: { id: IdentityStatus; label: string }[] = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'rechazada', label: 'Rechazadas' },
]

/** The admin's queue of new athletes to verify: selfie, ID photo, what was found on the web and the AI's first opinion. */
export function IdentityReviews() {
  const [status, setStatus] = useState<IdentityStatus>('pendiente')
  const { data, isLoading, mutate } = useSWR(['admin:identity', status], () => listIdentityReviews(status))

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Cada deportista nuevo manda una selfie y, si quiere, su DNI. Compará la selfie con las fotos públicas y el documento, mirá las fuentes y decidí. Al aprobar aparece el tilde azul en su perfil; aprobada o rechazada, las fotos se borran.
      </p>
      <div role="tablist" className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={status === t.id}
            onClick={() => setStatus(t.id)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', status === t.id ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Cargando" /> : null}
      {data && !data.length ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay verificaciones {tabs.find((t) => t.id === status)?.label.toLowerCase()}.</p> : null}
      <ul className="flex flex-col gap-4">
        {data?.map((r) => (
          <ReviewCard
            key={r.userId}
            review={r}
            onDone={() => {
              mutate()
              // The counter in the sidebar and the lists, where the tilde azul shows up.
              globalMutate((key) => typeof key === 'string' && key.startsWith('admin:'))
            }}
          />
        ))}
      </ul>
    </div>
  )
}

function Verdict({ label, value }: { label: string; value: boolean | null }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', value === null ? 'bg-secondary text-muted-foreground' : value ? 'bg-olympic-green/15 text-olympic-green' : 'bg-olympic-red/15 text-olympic-red')}>
      {label}: {value === null ? 'sin datos' : value ? 'coincide' : 'no coincide'}
    </span>
  )
}

function Photo({ src, label, className }: { src: string; label: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={src} alt={label} referrerPolicy="no-referrer" className={cn('h-40 rounded-xl bg-secondary object-cover', className)} />
  return (
    <figure className="flex flex-col gap-1">
      {/* Browsers block opening data: URLs in a new tab, so only web photos get a link. */}
      {src.startsWith('https://') ? (
        <a href={src} target="_blank" rel="noreferrer">
          {img}
        </a>
      ) : (
        img
      )}
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

function ReviewCard({ review: r, onDone }: { review: IdentityReview; onDone: () => void }) {
  const { toast } = useAdminFeedback()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<'ok' | 'elite' | 'no' | null>(null)

  async function decide(approve: boolean, elite = false) {
    setPending(!approve ? 'no' : elite ? 'elite' : 'ok')
    const res = await decideIdentity(r.userId, approve, note, elite)
    setPending(null)
    if (!res.ok) return toast(res.error, 'error')
    toast(!approve ? `Rechazaste la verificación de ${r.name}.` : elite ? `${r.name} quedó verificado como atleta de alto rendimiento.` : `${r.name} quedó verificado.`)
    onDone()
  }

  const ai = r.aiCheck
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-semibold">
            {r.name}
            {r.status === 'aprobada' ? <BadgeCheck className="size-5 text-olympic-blue" aria-label="Verificado" /> : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {[r.discipline, r.country, r.email].filter(Boolean).join(' · ')} · {formatDate(r.createdAt, true)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {r.claimed ? <span className="rounded-full bg-olympic-blue/15 px-2.5 py-1 text-xs font-bold text-olympic-blue">Dijo ser la persona encontrada en la web</span> : <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">Perfil desde cero</span>}
          {r.document ? (
            <span className="flex items-center gap-1 rounded-full bg-olympic-yellow/15 px-2.5 py-1 text-xs font-bold text-olympic-yellow">
              <IdCard className="size-3.5" /> Con DNI
            </span>
          ) : null}
        </div>
      </header>

      {r.official.length ? (
        <div className="flex flex-col gap-2 rounded-xl border border-olympic-yellow/50 bg-olympic-yellow/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-olympic-yellow">
            <Medal className="size-4" /> Figura en fuentes oficiales
          </p>
          <ul className="flex flex-wrap gap-2">
            {r.official.map((o) => (
              <li key={o.url}>
                <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-sm font-semibold hover:bg-secondary">
                  {o.source} <ExternalLink className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">Abrí el perfil oficial y compará la foto, el nombre, el país y el deporte con la selfie y el DNI. Si todo coincide, aprobalo como atleta de alto rendimiento.</p>
        </div>
      ) : null}

      {r.selfie || r.document || r.photos.length ? (
        <div className="flex flex-wrap gap-3">
          {r.selfie ? <Photo src={r.selfie} label="Selfie" className="w-32" /> : null}
          {r.document ? <Photo src={r.document} label="DNI" className="w-56" /> : null}
          {r.photos.map((p, i) => (
            <Photo key={p} src={p} label={`Foto pública ${i + 1}`} className="w-32" />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Las fotos se borraron al decidir.</p>
      )}

      {ai ? (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Bot className="size-3.5" /> Primera opinión de la IA ({ai.confidence}% de confianza)
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Verdict label="Rostro real" value={ai.faceDetected} />
            <Verdict label="Fotos públicas" value={ai.matchesPublicPhotos} />
            <Verdict label="DNI" value={ai.matchesDocument} />
          </div>
          {ai.documentName ? <p className="text-sm">Nombre en el DNI: <strong>{ai.documentName}</strong></p> : null}
          <p className="text-sm leading-relaxed">{ai.notes}</p>
        </div>
      ) : r.status === 'pendiente' ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bot className="size-3.5" /> La IA todavía no dio su opinión (o no estaba disponible). Compará a ojo.
        </p>
      ) : null}

      {r.sources.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Fuentes encontradas en la web ({r.sources.length})</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {r.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0" /> {s.title} · {s.source}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {r.status === 'pendiente' ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Nota (obligatoria para rechazar)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ej.: la selfie no coincide con las fotos de la prensa" className="h-10 rounded-lg border border-border bg-background px-3" />
          </label>
          <div className="flex flex-wrap gap-2">
            {r.official.length ? (
              <Button variant="primary" pending={pending === 'elite'} onClick={() => decide(true, true)}>
                <Medal className="size-4" /> Aprobar como alto rendimiento
              </Button>
            ) : null}
            <Button variant={r.official.length ? 'secondary' : 'primary'} pending={pending === 'ok'} onClick={() => decide(true)}>
              <ShieldCheck className="size-4" /> Aprobar identidad
            </Button>
            <Button variant="danger" pending={pending === 'no'} onClick={() => decide(false)}>
              <ShieldX className="size-4" /> Rechazar
            </Button>
          </div>
        </div>
      ) : r.note ? (
        <p className="text-sm text-muted-foreground">Nota: {r.note}</p>
      ) : null}
    </li>
  )
}
