'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2, Pencil, Plus, ShoppingBag, Trash2, Trophy } from 'lucide-react'
import { removeMyChallenge, saveMyChallenge, saveMyProducts } from '@/app/actions/profile'
import type { MatchSummary } from '@/app/actions/match'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { useNav } from '@/components/app/nav'
import { Field, FormError, TextareaField } from '@/components/auth/field'
import { ImageInput } from '@/components/profile/org-profile-form'
import type { MerchItem, OrgChallenge, SponsoredAthlete } from '@/lib/profile-types'
import { thumbOf } from '@/lib/image-variants'

/** "2026-12-05" → "Hasta el 5 de diciembre"; empty means no deadline. */
export function deadlineLabel(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return value
  return `Hasta el ${new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
}

/** Today as "YYYY-MM-DD" in local time, the format of a date input. */
function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A challenge is open until the end of its deadline day (or forever without one). */
export function isOpen(c: OrgChallenge) {
  if (!c.deadline) return true
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.deadline)
  return !m || new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1) > new Date()
}

const sectionTitle = 'flex items-center gap-2 font-display text-xl font-semibold'
const addButton = 'flex items-center gap-1.5 rounded-full bg-olympic-blue px-3.5 py-2 text-sm font-bold text-olympic-white'

/** The sponsor's challenges on its own profile: propose, edit and remove. */
export function ChallengesSection({ challenges }: { challenges: OrgChallenge[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<OrgChallenge | 'new' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function remove(c: OrgChallenge) {
    if (!window.confirm(`¿Borrar el desafío “${c.title}”? Los deportistas ya no lo van a ver.`)) return
    setRemoving(c.id)
    const res = await removeMyChallenge(c.id)
    setRemoving(null)
    if (!res.ok) return window.alert(res.error)
    router.refresh()
  }

  return (
    <section aria-labelledby="challenges-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="challenges-title" className={sectionTitle}>
          <Trophy className="size-5 text-olympic-yellow" />
          Desafíos
        </h2>
        <button type="button" onClick={() => setEditing('new')} className={addButton}>
          <Plus className="size-4" />
          Proponer desafío
        </button>
      </div>
      {challenges.length ? (
        <ul className="flex flex-col gap-2">
          {challenges.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-2xl border border-olympic-yellow/40 bg-card p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold leading-snug">{c.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{c.detail}</span>
                <span className="text-sm font-semibold text-olympic-green">Premio: {c.reward}</span>
                {c.deadline ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {isOpen(c) ? deadlineLabel(c.deadline) : 'Cerrado'}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => setEditing(c)} aria-label={`Editar ${c.title}`} className="flex size-9 items-center justify-center rounded-full hover:bg-secondary">
                  <Pencil className="size-4" />
                </button>
                <button type="button" onClick={() => remove(c)} disabled={removing === c.id} aria-label={`Borrar ${c.title}`} className="flex size-9 items-center justify-center rounded-full text-olympic-red hover:bg-secondary disabled:opacity-50">
                  {removing === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted-foreground">
          Proponé un desafío (un video, una marca personal, una prueba de producto) y los deportistas se postulan desde el Inicio. Es la forma más rápida de conocer a quién sponsorear.
        </p>
      )}
      {editing ? <ChallengeSheet initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </section>
  )
}

function ChallengeSheet({ initial, onClose }: { initial: OrgChallenge | null; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({ title: initial?.title ?? '', detail: initial?.detail ?? '', reward: initial?.reward ?? '', deadline: initial?.deadline ?? '' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // A deadline in the past would publish the challenge already closed.
    if (form.deadline && form.deadline !== initial?.deadline && form.deadline < todayInput()) return setError('La fecha límite ya pasó. Elegí una fecha de hoy en adelante.')
    setPending(true)
    setError(null)
    const res = await saveMyChallenge({ ...form, id: initial?.id })
    setPending(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
    onClose()
  }

  return (
    <Sheet title={initial ? 'Editar desafío' : 'Proponer desafío'} onClose={onClose} modal>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Título" value={form.title} maxLength={80} onChange={set('title')} placeholder="Ej.: Tu mejor combinación en 15 segundos" />
        <TextareaField label="En qué consiste" value={form.detail} maxLength={400} onChange={set('detail')} placeholder="Qué tienen que hacer, cómo lo mandan y qué van a mirar." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Premio" value={form.reward} maxLength={80} onChange={set('reward')} placeholder="Ej.: Kit de guantes + contrato de 3 meses" />
          <Field label="Fecha límite (opcional)" type="date" min={todayInput()} value={form.deadline} onChange={set('deadline')} />
        </div>
        <FormError message={error} />
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue py-3 font-bold text-olympic-white disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {initial ? 'Guardar cambios' : 'Publicar desafío'}
        </button>
      </form>
    </Sheet>
  )
}

/** The sponsor's shop on its own profile, with a button to manage the products. */
export function ShopSection({ merch }: { merch: MerchItem[] }) {
  const [managing, setManaging] = useState(false)
  return (
    <section aria-labelledby="merch-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="merch-title" className={sectionTitle}>
          <ShoppingBag className="size-5 text-olympic-green" />
          Tienda
        </h2>
        <button type="button" onClick={() => setManaging(true)} className={addButton}>
          {merch.length ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {merch.length ? 'Gestionar tienda' : 'Agregar productos'}
        </button>
      </div>
      {merch.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {merch.map((m, i) => (
            <li key={`${m.name}-${i}`} className="flex flex-col gap-2 rounded-2xl bg-card p-2">
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={thumbOf(m.image)} alt={m.name} className="aspect-square w-full rounded-xl object-cover" />
              ) : (
                <button type="button" onClick={() => setManaging(true)} className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <ShoppingBag className="size-7" />
                  Sumar foto
                </button>
              )}
              <div className="flex flex-col px-1 pb-1">
                <span className="text-sm font-semibold leading-tight">{m.name}</span>
                {m.price ? <span className="font-display text-lg font-semibold text-olympic-green">{m.price}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted-foreground">
          Mostrá tus productos: los deportistas los ven en tu página y saben qué podés ofrecerles.
        </p>
      )}
      {managing ? <ShopSheet initial={merch} onClose={() => setManaging(false)} /> : null}
    </section>
  )
}

function ShopSheet({ initial, onClose }: { initial: MerchItem[]; onClose: () => void }) {
  const router = useRouter()
  const [items, setItems] = useState<MerchItem[]>(initial.length ? initial : [{ name: '', price: '' }])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = (i: number, change: Partial<MerchItem>) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...change } : x)))

  async function save() {
    // The server drops products without a name; say so instead of losing the price or photo.
    if (items.some((m) => !m.name.trim() && (m.price.trim() || m.image))) return setError('Poné el nombre de cada producto o quitá los que no uses.')
    setPending(true)
    setError(null)
    const res = await saveMyProducts(items)
    setPending(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
    onClose()
  }

  return (
    <Sheet
      title="Tu tienda"
      onClose={onClose}
      action={
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-olympic-blue px-4 py-2 text-sm font-bold text-olympic-white disabled:opacity-60">
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <FormError message={error} />
        {items.map((m, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border p-3">
            <ImageInput label="Foto del producto" value={m.image} onChange={(v) => update(i, { image: v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Producto" value={m.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} />
              <Field label="Precio" value={m.price} maxLength={30} onChange={(e) => update(i, { price: e.target.value })} placeholder="$ 85.000" />
            </div>
            <button type="button" onClick={() => setItems((list) => list.filter((_, j) => j !== i))} className="inline-flex w-fit items-center gap-1.5 text-sm text-olympic-red">
              <Trash2 className="size-4" /> Quitar producto
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setItems((list) => [...list, { name: '', price: '' }])} className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm font-semibold hover:bg-secondary">
          <Plus className="size-4" /> Agregar producto
        </button>
      </div>
    </Sheet>
  )
}

/** Everyone the sponsor backs: the athletes on its profile and the deals closed in Mensajes. */
export function SponsoredSheet({ sponsored, deals, onClose }: { sponsored: SponsoredAthlete[]; deals: MatchSummary[]; onClose: () => void }) {
  const nav = useNav()
  const people = [
    ...sponsored.map((s) => ({ key: s.key, party: { name: s.name, image: s.image, initials: s.name.slice(0, 2).toUpperCase(), role: 'deportista' as const }, line: `${s.discipline} · desde ${s.since}`, chat: null as number | null })),
    ...deals.filter((d) => !sponsored.some((s) => s.key === d.other.key)).map((d) => ({ key: d.other.key, party: d.other, line: 'Acuerdo cerrado en Mensajes', chat: d.id })),
  ]
  return (
    <Sheet title="Sponsoreados" onClose={onClose} modal>
      {people.length ? (
        <ul className="flex flex-col gap-1">
          {people.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => (onClose(), p.chat !== null ? nav.openChat(p.chat) : nav.openProfile(p.key))}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-secondary"
              >
                <PartyAvatar party={p.party} className="size-11" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold">{p.party.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{p.line}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Todavía no sponsoreás a nadie. Cuando cierres un acuerdo en Mensajes aparece acá.</p>
      )}
    </Sheet>
  )
}
