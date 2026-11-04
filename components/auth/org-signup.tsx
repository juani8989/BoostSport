'use client'

import { useState } from 'react'
import { AuthError, registerAccount, type PendingVerification, type Role } from '@/lib/auth-store'
import { countries, roleConfig } from '@/lib/roles'
import { Field, FormError, TextareaField, validateCredentials } from '@/components/auth/field'
import { CheckEmail } from '@/components/auth/check-email'
import { cn } from '@/lib/utils'

export function OrgSignup({ role }: { role: Exclude<Role, 'deportista'> }) {
  const isEvent = role === 'evento'
  const [form, setForm] = useState({
    orgName: '',
    category: '',
    country: '',
    city: '',
    website: '',
    lookingFor: '',
    eventDate: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [verification, setVerification] = useState<PendingVerification | null>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validateCredentials(form.email, form.password, form.confirm)
    if (form.orgName.trim().length < 2) next.orgName = 'Ingresá el nombre.'
    if (!form.category.trim()) next.category = 'Completá este campo.'
    if (!form.country.trim()) next.country = 'Elegí un país.'
    if (form.lookingFor.trim().length < 10) next.lookingFor = 'Contanos un poco más (mínimo 10 caracteres).'
    if (isEvent && !form.eventDate) next.eventDate = 'Elegí la fecha.'
    if (form.website && !/^https?:\/\/\S+\.\S+/.test(form.website)) next.website = 'Debe empezar con https://'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return

    setPending(true)
    try {
      const sent = await registerAccount({
        role,
        email: form.email,
        password: form.password,
        name: form.orgName,
        profile: {
          kind: role,
          orgName: form.orgName.trim(),
          category: form.category.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          website: form.website.trim(),
          lookingFor: form.lookingFor.trim(),
          eventDate: isEvent ? form.eventDate : undefined,
        },
      })
      setVerification(sent)
      setPending(false)
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : 'No pudimos crear el usuario.')
      setPending(false)
    }
  }

  if (verification) {
    return <CheckEmail pending={verification} accent={roleConfig[role].button} onBack={() => setVerification(null)} />
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label={isEvent ? 'Nombre del evento u organización' : 'Nombre de la empresa'} value={form.orgName} onChange={set('orgName')} error={errors.orgName} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={isEvent ? 'Tipo de evento' : 'Rubro'}
          placeholder={isEvent ? 'Maratón, torneo, copa…' : 'Indumentaria, bebidas…'}
          value={form.category}
          onChange={set('category')}
          error={errors.category}
        />
        {isEvent ? (
          <Field label="Fecha del evento" type="date" value={form.eventDate} onChange={set('eventDate')} error={errors.eventDate} />
        ) : (
          <Field label="Sitio web" placeholder="https://" value={form.website} onChange={set('website')} error={errors.website} />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="País" list="org-countries" value={form.country} onChange={set('country')} error={errors.country} />
        <Field label="Ciudad" value={form.city} onChange={set('city')} />
      </div>
      <datalist id="org-countries">
        {countries.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <TextareaField
        label={isEvent ? '¿Qué deportistas buscan?' : '¿Qué tipo de deportista buscan?'}
        placeholder={isEvent ? 'Ej: corredores de trail para la largada élite' : 'Ej: corredora sub-23 para campaña de invierno'}
        value={form.lookingFor}
        onChange={set('lookingFor')}
        error={errors.lookingFor}
      />
      <hr className="border-olympic-white/10" />
      <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contraseña" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Field label="Repetir contraseña" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      </div>
      <FormError message={formError} />
      <button type="submit" disabled={pending} className={cn('rounded-full px-5 py-3 font-bold disabled:opacity-60', roleConfig[role].button)}>
        {pending ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  )
}
