'use client'

import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import type { AthleteProfile, OrgProfile } from '@/lib/profile-types'
import { countries, disciplines, needOptions } from '@/lib/roles'
import { compressImage } from '@/components/app/kit'
import { AdminField, AdminSelect, AdminTextarea, Button, IconButton, Section, Toggle } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

type Profile = AthleteProfile | OrgProfile

export function AdminProfileForm({ initial, pending, error, onSubmit }: { initial: Profile; pending: boolean; error: string | null; onSubmit: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>(initial)
  const dirty = JSON.stringify(p) !== JSON.stringify(initial)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(p)
      }}
      className="flex flex-col gap-6 pb-24"
    >
      {p.kind === 'deportista' ? <AthleteFields p={p} set={(next) => setP(next)} /> : <OrgFields p={p} set={(next) => setP(next)} />}

      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-border bg-background/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className={cn('flex-1 text-sm', error ? 'text-olympic-red' : 'text-muted-foreground')}>{error ?? (dirty ? 'Tenés cambios sin guardar.' : 'Sin cambios.')}</p>
        <Button onClick={() => setP(initial)} disabled={!dirty || pending}>
          Descartar
        </Button>
        <Button type="submit" variant="primary" pending={pending} disabled={!dirty}>
          Guardar perfil
        </Button>
      </div>
    </form>
  )
}

function ImagePicker({ label, value, onChange, round }: { label: string; value?: string; onChange: (v: string | undefined) => void; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className={cn('flex size-20 shrink-0 items-center justify-center overflow-hidden border border-border bg-secondary', round ? 'rounded-full' : 'rounded-xl')}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </span>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => input.current?.click()}>
              Subir imagen
            </Button>
            {value ? (
              <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
                Quitar
              </Button>
            ) : null}
          </div>
          <input
            type="url"
            placeholder="o pegá una URL https://…"
            value={value && !value.startsWith('data:') ? value : ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="h-8 w-64 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-foreground/60"
          />
          {error ? <p className="text-xs text-olympic-red">{error}</p> : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              setError(null)
              onChange(await compressImage(file, 800))
            } catch {
              setError('No se pudo leer la imagen.')
            }
          }}
        />
      </div>
    </div>
  )
}

/** Editable list with add, remove and reorder. */
function ListEditor<T>({
  title,
  description,
  items,
  onChange,
  blank,
  render,
}: {
  title: string
  description?: string
  items: T[]
  onChange: (items: T[]) => void
  blank: T
  render: (item: T, update: (next: T) => void) => React.ReactNode
}) {
  const move = (from: number, to: number) => {
    const next = [...items]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    onChange(next)
  }
  return (
    <Section
      title={title}
      description={description}
      actions={
        <Button size="sm" onClick={() => onChange([...items, blank])}>
          <Plus className="size-3.5" /> Agregar
        </Button>
      }
    >
      {items.length ? (
        <ol className="flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 rounded-xl border border-border p-3">
              <span className="w-5 pt-2 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">{render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}</div>
              <div className="flex flex-col gap-0.5">
                <IconButton label="Subir" disabled={i === 0} onClick={() => move(i, i - 1)} className="disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </IconButton>
                <IconButton label="Bajar" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} className="disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </IconButton>
                <IconButton label="Quitar" tone="danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Vacío. Tocá «Agregar».</p>
      )}
    </Section>
  )
}

const withOption = (list: string[], value: string) => (value && !list.includes(value) ? [value, ...list] : list)

function AthleteFields({ p, set }: { p: AthleteProfile; set: (p: AthleteProfile) => void }) {
  const f = <K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) => set({ ...p, [key]: value })
  const text = (key: 'firstName' | 'lastName' | 'age' | 'goals' | 'achievements' | 'studies' | 'recognitions' | 'needsDetail' | 'summary' | 'wikiUrl') => ({
    value: p[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => f(key, e.target.value),
  })

  return (
    <>
      <Section title="Identidad">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImagePicker label="Foto de perfil" value={p.photo} onChange={(v) => f('photo', v)} round />
          </div>
          <AdminField label="Nombre" {...text('firstName')} />
          <AdminField label="Apellido" {...text('lastName')} />
          <AdminSelect label="Disciplina" value={p.discipline} onChange={(e) => f('discipline', e.target.value)} options={[{ value: '', label: 'Elegí…' }, ...withOption(disciplines, p.discipline).map((d) => ({ value: d, label: d }))]} />
          <AdminSelect label="País" value={p.country} onChange={(e) => f('country', e.target.value)} options={withOption(countries, p.country).map((c) => ({ value: c, label: c }))} />
          <AdminField label="Edad" type="number" min={8} max={90} {...text('age')} />
          <AdminField label="Página de Wikipedia" type="url" {...text('wikiUrl')} />
          <Toggle label="Identidad verificada" hint="Muestra el tilde azul" checked={p.identityVerified} onChange={(v) => f('identityVerified', v)} />
          <Toggle label="Atleta reconocido" hint="Destacado como figura conocida" checked={p.famous} onChange={(v) => f('famous', v)} />
        </div>
      </Section>

      <Section title="Historia">
        <div className="grid gap-4">
          <AdminTextarea label="Resumen" {...text('summary')} />
          <AdminTextarea label="Objetivos" {...text('goals')} />
          <AdminTextarea label="Logros" {...text('achievements')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminTextarea label="Estudios" {...text('studies')} />
            <AdminTextarea label="Reconocimientos" {...text('recognitions')} />
          </div>
        </div>
      </Section>

      <Section title="Qué necesita">
        <div className="flex flex-wrap gap-2">
          {needOptions.map((n) => {
            const on = p.needs.includes(n)
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => f('needs', on ? p.needs.filter((x) => x !== n) : [...p.needs, n])}
                className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors', on ? 'border-olympic-blue bg-olympic-blue text-white' : 'border-border text-muted-foreground')}
              >
                {n}
              </button>
            )
          })}
        </div>
        <AdminTextarea label="Detalle" className="mt-4" {...text('needsDetail')} />
      </Section>

      <Section title="Redes sociales">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['instagram', 'tiktok', 'x', 'youtube'] as const).map((k) => (
            <AdminField key={k} label={k === 'x' ? 'X' : k[0].toUpperCase() + k.slice(1)} value={p.socials[k]} onChange={(e) => f('socials', { ...p.socials, [k]: e.target.value })} placeholder="@usuario o URL" />
          ))}
        </div>
      </Section>

      <ListEditor
        title="Trayectoria"
        description="Hitos ordenados. Usá las flechas para moverlos."
        items={p.timeline}
        onChange={(v) => f('timeline', v)}
        blank={{ year: '', text: '' }}
        render={(t, update) => (
          <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
            <AdminField label="Año" value={t.year} onChange={(e) => update({ ...t, year: e.target.value })} />
            <AdminField label="Hito" value={t.text} onChange={(e) => update({ ...t, text: e.target.value })} />
          </div>
        )}
      />

      <ListEditor
        title="Galería de fotos"
        items={p.gallery ?? []}
        onChange={(v) => f('gallery', v)}
        blank={{ src: '', caption: '' }}
        render={(g, update) => (
          <div className="grid gap-3">
            <ImagePicker label="Imagen" value={g.src || undefined} onChange={(v) => update({ ...g, src: v ?? '' })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <AdminField label="Epígrafe" value={g.caption} onChange={(e) => update({ ...g, caption: e.target.value })} />
              <AdminField label="Crédito" value={g.credit ?? ''} onChange={(e) => update({ ...g, credit: e.target.value || undefined })} />
            </div>
          </div>
        )}
      />
    </>
  )
}

function OrgFields({ p, set }: { p: OrgProfile; set: (p: OrgProfile) => void }) {
  const f = <K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) => set({ ...p, [key]: value })
  const text = (key: 'orgName' | 'category' | 'city' | 'website' | 'lookingFor' | 'description' | 'eventDate') => ({
    value: p[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => f(key, e.target.value),
  })
  const info = p.eventInfo ?? { distance: '', place: '', requirements: '', signup: '', reach: '' }
  const setInfo = (key: keyof typeof info, value: string) => f('eventInfo', { ...info, [key]: value })

  return (
    <>
      <Section title="Identidad">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImagePicker label="Logo" value={p.logo} onChange={(v) => f('logo', v)} round />
          </div>
          <AdminField label={p.kind === 'empresa' ? 'Nombre de la marca' : 'Nombre de la institución'} {...text('orgName')} />
          <AdminField label="Rubro / categoría" {...text('category')} />
          <AdminSelect label="País" value={p.country} onChange={(e) => f('country', e.target.value)} options={withOption(countries, p.country).map((c) => ({ value: c, label: c }))} />
          <AdminField label="Ciudad" {...text('city')} />
          <AdminField label="Sitio web" {...text('website')} className="sm:col-span-2" />
        </div>
      </Section>

      <Section title="Presentación">
        <div className="grid gap-4">
          <AdminTextarea label="Descripción" {...text('description')} />
          <AdminTextarea label="Qué busca" {...text('lookingFor')} />
        </div>
      </Section>

      {p.kind === 'evento' ? (
        <Section title="Evento">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Fecha" type="date" {...text('eventDate')} />
            <AdminField label="Lugar" value={info.place} onChange={(e) => setInfo('place', e.target.value)} />
            <AdminField label="Distancia / formato" value={info.distance} onChange={(e) => setInfo('distance', e.target.value)} />
            <AdminField label="Alcance" value={info.reach} onChange={(e) => setInfo('reach', e.target.value)} />
            <AdminTextarea label="Requisitos" value={info.requirements} onChange={(e) => setInfo('requirements', e.target.value)} />
            <AdminTextarea label="Inscripción" value={info.signup} onChange={(e) => setInfo('signup', e.target.value)} />
          </div>
        </Section>
      ) : null}

      <ListEditor
        title="Deportistas sponsoreados"
        items={p.sponsored ?? []}
        onChange={(v) => f('sponsored', v)}
        blank={{ key: '', name: '', discipline: '', since: String(new Date().getFullYear()) }}
        render={(s, update) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <AdminField label="Nombre" value={s.name} onChange={(e) => update({ ...s, name: e.target.value, key: s.key || `manual:${e.target.value}` })} />
            <AdminField label="Disciplina" value={s.discipline} onChange={(e) => update({ ...s, discipline: e.target.value })} />
            <AdminField label="Desde" value={s.since} onChange={(e) => update({ ...s, since: e.target.value })} />
            <AdminField label="URL de la foto" value={s.image ?? ''} onChange={(e) => update({ ...s, image: e.target.value || undefined })} className="sm:col-span-3" />
          </div>
        )}
      />

      <ListEditor
        title="Productos"
        items={p.merch ?? []}
        onChange={(v) => f('merch', v)}
        blank={{ name: '', price: '' }}
        render={(m, update) => (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <AdminField label="Producto" value={m.name} onChange={(e) => update({ ...m, name: e.target.value })} />
              <AdminField label="Precio" value={m.price} onChange={(e) => update({ ...m, price: e.target.value })} />
            </div>
            <ImagePicker label="Imagen" value={m.image} onChange={(v) => update({ ...m, image: v })} />
          </div>
        )}
      />
    </>
  )
}
