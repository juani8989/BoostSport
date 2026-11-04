'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import type { MerchItem, OrgProfile } from '@/lib/profile-types'
import { countries } from '@/lib/roles'
import { compressImage } from '@/components/app/kit'
import { Field, FormError, TextareaField } from '@/components/auth/field'
import { cn } from '@/lib/utils'

export function ImageInput({ label, value, onChange, round }: { label: string; value?: string; onChange: (v: string | undefined) => void; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={`Subir ${label.toLowerCase()}`}
        className={cn('flex size-20 shrink-0 items-center justify-center overflow-hidden border border-olympic-white/20 bg-olympic-white/5', round ? 'rounded-full' : 'rounded-xl')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-olympic-white/50" />}
      </button>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-olympic-white/80">{label}</span>
        <div className="flex gap-3 text-sm">
          <button type="button" onClick={() => input.current?.click()} className="font-semibold underline underline-offset-4">
            {value ? 'Cambiar' : 'Subir imagen'}
          </button>
          {value ? (
            <button type="button" onClick={() => onChange(undefined)} className="text-olympic-white/60">
              Quitar
            </button>
          ) : null}
        </div>
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
            onChange(await compressImage(file, 600))
          } catch {
            setError('No se pudo leer la imagen.')
          }
        }}
      />
    </div>
  )
}

export function OrgProfileForm({ initial, pending, error, onSubmit }: { initial: OrgProfile; pending: boolean; error: string | null; onSubmit: (p: OrgProfile) => void }) {
  const [p, setP] = useState(initial)
  const isEvent = p.kind === 'evento'
  const info = p.eventInfo ?? { distance: '', place: '', requirements: '', signup: '', reach: '' }
  const set = <K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) => setP((prev) => ({ ...prev, [key]: value }))
  const text = (key: 'orgName' | 'category' | 'country' | 'city' | 'website' | 'lookingFor' | 'description' | 'eventDate') => ({
    value: p[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  })
  const setInfo = (key: keyof typeof info, value: string) => set('eventInfo', { ...info, [key]: value })
  const merch = p.merch ?? []
  const setMerch = (items: MerchItem[]) => set('merch', items)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(p)
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      <ImageInput label="Logo" value={p.logo} onChange={(v) => set('logo', v)} round />
      <Field label={isEvent ? 'Nombre del evento u organización' : 'Nombre de la empresa'} {...text('orgName')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rubro" {...text('category')} />
        <Field label="Sitio web" placeholder="https://" {...text('website')} />
        <Field label="País" list="org-countries" {...text('country')} />
        <Field label="Ciudad" {...text('city')} />
      </div>
      <TextareaField label="Descripción" {...text('description')} />
      <TextareaField label={isEvent ? '¿Qué deportistas buscan?' : '¿Qué tipo de deportista buscan?'} {...text('lookingFor')} />

      {isEvent ? (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-semibold text-olympic-white/80">Datos del evento</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" type="date" {...text('eventDate')} />
            <Field label="Lugar" value={info.place} onChange={(e) => setInfo('place', e.target.value)} />
            <Field label="Distancia o formato" value={info.distance} onChange={(e) => setInfo('distance', e.target.value)} />
            <Field label="Alcance" value={info.reach} onChange={(e) => setInfo('reach', e.target.value)} />
          </div>
          <TextareaField label="Requisitos" value={info.requirements} onChange={(e) => setInfo('requirements', e.target.value)} />
          <TextareaField label="Inscripción" value={info.signup} onChange={(e) => setInfo('signup', e.target.value)} />
        </fieldset>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold text-olympic-white/80">Productos</legend>
          {merch.map((m, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-olympic-white/15 p-3">
              <ImageInput label="Imagen" value={m.image} onChange={(v) => setMerch(merch.map((x, j) => (j === i ? { ...x, image: v } : x)))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Producto" value={m.name} onChange={(e) => setMerch(merch.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <Field label="Precio" value={m.price} onChange={(e) => setMerch(merch.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              </div>
              <button type="button" onClick={() => setMerch(merch.filter((_, j) => j !== i))} className="inline-flex w-fit items-center gap-1.5 text-sm text-olympic-red">
                <Trash2 className="size-4" /> Quitar producto
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setMerch([...merch, { name: '', price: '' }])} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold">
            <Plus className="size-4" /> Agregar producto
          </button>
        </fieldset>
      )}

      <datalist id="org-countries">
        {countries.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <FormError message={error} />
      <button type="submit" disabled={pending} className={cn('rounded-full px-5 py-3 font-bold disabled:opacity-60', isEvent ? 'bg-olympic-green text-olympic-white' : 'bg-olympic-yellow text-olympic-black')}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
