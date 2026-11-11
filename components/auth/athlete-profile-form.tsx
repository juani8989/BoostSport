'use client'

import { useState } from 'react'
import { BadgeCheck, Plus, X } from 'lucide-react'
import type { AthleteProfile } from '@/lib/auth-store'
import { disciplines, needOptions } from '@/lib/roles'
import { Field, FormError, TextareaField } from '@/components/auth/field'
import { ImageInput } from '@/components/profile/org-profile-form'
import { cn } from '@/lib/utils'

export function AthleteProfileForm({
  initial,
  pending,
  error,
  onSubmit,
  submitLabel = 'Crear mi perfil',
  pendingLabel = 'Creando perfil…',
  formId,
  hideSubmit,
}: {
  initial: AthleteProfile
  pending: boolean
  error: string | null
  onSubmit: (profile: AthleteProfile) => void
  submitLabel?: string
  pendingLabel?: string
  /** Lets a button outside the form (in the screen's header) submit it. */
  formId?: string
  hideSubmit?: boolean
}) {
  const [p, setP] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) => setP((prev) => ({ ...prev, [key]: value }))
  const text = (key: 'age' | 'goals' | 'achievements' | 'studies' | 'recognitions' | 'discipline' | 'needsDetail') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const age = Number(p.age)
    if (!Number.isInteger(age) || age < 8 || age > 90) next.age = 'Ingresá una edad entre 8 y 90.'
    if (!p.discipline.trim()) next.discipline = 'Completá tu disciplina.'
    if (p.goals.trim().length < 10) next.goals = 'Contanos tus objetivos (mínimo 10 caracteres).'
    if (!p.achievements.trim()) next.achievements = 'Sumá al menos un logro.'
    if (p.needs.length === 0) next.needs = 'Elegí al menos una necesidad.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit({ ...p, timeline: p.timeline.filter((t) => t.year.trim() || t.text.trim()) })
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {p.famous ? (
        <div className="flex gap-4 rounded-xl border border-olympic-blue bg-olympic-blue/15 p-4">
          {p.photo ? (
            <img src={p.photo} alt={`${p.firstName} ${p.lastName}`} referrerPolicy="no-referrer" className="size-20 shrink-0 rounded-lg object-cover object-top" />
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-olympic-blue">
              <BadgeCheck className="size-4" /> {p.identityVerified ? 'Identidad verificada' : 'Encontrado en la web'}
            </p>
            <p className="font-display text-xl font-semibold leading-tight">
              {p.firstName} {p.lastName}
            </p>
            {p.summary ? <p className="text-sm leading-relaxed text-olympic-white/75 text-pretty">{p.summary}</p> : null}
            <p className="text-xs text-olympic-white/50">Revisá lo que encontramos: podés editar o agregar lo que quieras.</p>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-olympic-white/70">
          Completá tu perfil: es lo que van a ver las marcas y los organizadores.
        </p>
      )}

      <ImageInput label="Foto de perfil" value={p.photo} onChange={(v) => set('photo', v)} round />
      <TextareaField label="Resumen" placeholder="Contá en pocas líneas quién sos como deportista" value={p.summary ?? ''} onChange={(e) => set('summary', e.target.value)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Edad" type="number" inputMode="numeric" min={8} max={90} value={p.age} onChange={text('age')} error={errors.age} />
        <Field label="Disciplina" list="athlete-disciplines" value={p.discipline} onChange={text('discipline')} error={errors.discipline} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Apodos o cómo te conocen"
          hint="Separados por coma. Los usamos para encontrarte en noticias y videos."
          placeholder="Ej: La Peque, Juani"
          value={(p.nicknames ?? []).join(', ')}
          onChange={(e) => set('nicknames', e.target.value.split(',').map((n) => n.trimStart()).slice(0, 8))}
        />
        <Field label="Club o equipo" placeholder="Ej: Club Atlético Rosario" value={p.club ?? ''} onChange={(e) => set('club', e.target.value)} />
      </div>

      <TextareaField label="Objetivos" placeholder="Ej: clasificar al Panamericano 2027" value={p.goals} onChange={text('goals')} error={errors.goals} />
      <TextareaField label="Logros" hint="Uno por línea" value={p.achievements} onChange={text('achievements')} error={errors.achievements} />
      <TextareaField label="Reconocimientos" hint="Premios, becas, distinciones. Uno por línea" value={p.recognitions} onChange={text('recognitions')} />
      <Field label="Estudios" placeholder="Ej: Profesorado de Educación Física (en curso)" value={p.studies} onChange={text('studies')} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold text-olympic-white/80">Trayectoria desde que empezaste</legend>
        {p.timeline.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              aria-label="Año"
              placeholder="Año"
              value={entry.year}
              onChange={(e) => set('timeline', p.timeline.map((t, j) => (j === i ? { ...t, year: e.target.value } : t)))}
              className="w-20 shrink-0 rounded-lg border border-olympic-white/20 bg-olympic-white/5 px-3 py-2.5 text-base outline-none focus:border-olympic-white/70"
            />
            <input
              aria-label="Hito"
              placeholder="Qué pasó ese año"
              value={entry.text}
              onChange={(e) => set('timeline', p.timeline.map((t, j) => (j === i ? { ...t, text: e.target.value } : t)))}
              className="min-w-0 flex-1 rounded-lg border border-olympic-white/20 bg-olympic-white/5 px-3 py-2.5 text-base outline-none focus:border-olympic-white/70"
            />
            <button
              type="button"
              aria-label="Quitar hito"
              onClick={() => set('timeline', p.timeline.filter((_, j) => j !== i))}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-olympic-white/60 hover:text-olympic-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set('timeline', [...p.timeline, { year: '', text: '' }])}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-olympic-blue"
        >
          <Plus className="size-4" /> Agregar hito
        </button>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1.5 text-sm font-semibold text-olympic-white/80">Redes sociales</legend>
        {(['instagram', 'tiktok', 'x', 'youtube'] as const).map((network) => (
          <Field
            key={network}
            label={network === 'x' ? 'X' : network[0].toUpperCase() + network.slice(1)}
            placeholder="@usuario"
            value={p.socials[network]}
            onChange={(e) => set('socials', { ...p.socials, [network]: e.target.value })}
          />
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold text-olympic-white/80">¿Qué necesitás?</legend>
        <div className="flex flex-wrap gap-2">
          {needOptions.map((need) => {
            const active = p.needs.includes(need)
            return (
              <button
                key={need}
                type="button"
                aria-pressed={active}
                onClick={() => set('needs', active ? p.needs.filter((n) => n !== need) : [...p.needs, need])}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  active ? 'border-olympic-blue bg-olympic-blue text-olympic-white' : 'border-olympic-white/25 text-olympic-white/80',
                )}
              >
                {need}
              </button>
            )
          })}
        </div>
        {errors.needs ? <p className="text-sm text-olympic-red">{errors.needs}</p> : null}
        <TextareaField label="Detalle" placeholder="Ej: USD 1.200 para viajar al Sudamericano de Lima" value={p.needsDetail} onChange={text('needsDetail')} />
      </fieldset>

      <datalist id="athlete-disciplines">
        {disciplines.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <FormError message={error} />
      {hideSubmit ? null : (
        <button type="submit" disabled={pending} className="rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white disabled:opacity-60">
          {pending ? pendingLabel : submitLabel}
        </button>
      )}
    </form>
  )
}
