'use client'

import { useState } from 'react'
import { ArrowLeft, ExternalLink, Loader2, Search, ShieldAlert, UserX } from 'lucide-react'
import { AuthError, registerAccount, type AthleteProfile, type PendingVerification } from '@/lib/auth-store'
import { countries, disciplines } from '@/lib/roles'
import { Field, FormError, validateCredentials } from '@/components/auth/field'
import { SelfieCapture } from '@/components/auth/selfie-capture'
import { AthleteProfileForm } from '@/components/auth/athlete-profile-form'
import { CheckEmail } from '@/components/auth/check-email'
import type { AthleteCandidate } from '@/app/api/athlete-search/route'

type Step = 'datos' | 'buscando' | 'candidatos' | 'selfie' | 'verificando' | 'perfil'

type Enriched = {
  summary: string
  age: string
  achievements: string[]
  recognitions: string[]
  studies: string
  timeline: { year: string; text: string }[]
}

const emptyProfile = (firstName: string, lastName: string, country: string, discipline: string): AthleteProfile => ({
  kind: 'deportista',
  firstName,
  lastName,
  country,
  discipline,
  famous: false,
  identityVerified: false,
  age: '',
  goals: '',
  achievements: '',
  studies: '',
  recognitions: '',
  timeline: [{ year: '', text: '' }],
  socials: { instagram: '', tiktok: '', x: '', youtube: '' },
  needs: [],
  needsDetail: '',
})

const steps: Step[] = ['datos', 'candidatos', 'selfie', 'perfil']

export function AthleteSignup() {
  const [step, setStep] = useState<Step>('datos')
  const [form, setForm] = useState({ firstName: '', lastName: '', country: '', discipline: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<AthleteCandidate[]>([])
  const [chosen, setChosen] = useState<AthleteCandidate | null>(null)
  const [verifyNote, setVerifyNote] = useState<string | null>(null)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [pending, setPending] = useState(false)
  const [verification, setVerification] = useState<PendingVerification | null>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const base = () => emptyProfile(form.firstName.trim(), form.lastName.trim(), form.country.trim(), form.discipline.trim())

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const next = validateCredentials(form.email, form.password, form.confirm)
    if (form.firstName.trim().length < 2) next.firstName = 'Ingresá tu nombre.'
    if (form.lastName.trim().length < 2) next.lastName = 'Ingresá tu apellido.'
    if (!form.country.trim()) next.country = 'Elegí tu país.'
    if (!form.discipline.trim()) next.discipline = 'Elegí tu disciplina.'
    setErrors(next)
    setError(null)
    if (Object.keys(next).length) return

    setStep('buscando')
    try {
      const params = new URLSearchParams({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        discipline: form.discipline,
        country: form.country,
      })
      const res = await fetch(`/api/athlete-search?${params}`)
      const data = (await res.json()) as { candidates?: AthleteCandidate[] }
      setCandidates((data.candidates ?? []).filter((c) => c.image))
    } catch {
      setCandidates([])
    }
    setStep('candidatos')
  }

  function continueWithoutMatch() {
    setChosen(null)
    setProfile(base())
    setStep('perfil')
  }

  async function handleSelfie(selfie: string) {
    if (!chosen?.image) return
    setStep('verificando')
    setVerifyNote(null)
    try {
      const res = await fetch('/api/verify-selfie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfie, referenceUrl: chosen.image }),
      })
      const data = (await res.json()) as { verified?: boolean; reason?: string; error?: string }
      if (!res.ok || !data.verified) {
        setVerifyNote(data.reason ?? data.error ?? 'No pudimos confirmar que seas vos.')
        setStep('selfie')
        return
      }

      const enrichRes = await fetch('/api/athlete-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: chosen.lang, title: chosen.title }),
      }).catch(() => null)
      const enriched = enrichRes?.ok ? ((await enrichRes.json()) as { profile: Enriched }).profile : null

      setProfile({
        ...base(),
        famous: true,
        identityVerified: true,
        photo: chosen.image,
        selfie,
        wikiUrl: chosen.url,
        summary: enriched?.summary || chosen.description,
        age: enriched?.age ?? '',
        achievements: enriched?.achievements.join('\n') ?? '',
        recognitions: enriched?.recognitions.join('\n') ?? '',
        studies: enriched?.studies ?? '',
        timeline: enriched?.timeline.length ? enriched.timeline : [{ year: '', text: '' }],
      })
      setStep('perfil')
    } catch {
      setVerifyNote('No pudimos verificar ahora. Probá de nuevo.')
      setStep('selfie')
    }
  }

  async function handleCreate(finalProfile: AthleteProfile) {
    setPending(true)
    setError(null)
    try {
      const sent = await registerAccount({
        role: 'deportista',
        email: form.email,
        password: form.password,
        name: `${finalProfile.firstName} ${finalProfile.lastName}`,
        profile: finalProfile,
      })
      setVerification(sent)
      setPending(false)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No pudimos crear el usuario.')
      setPending(false)
    }
  }

  if (verification) {
    return <CheckEmail pending={verification} onBack={() => setVerification(null)} />
  }

  const visibleStep = step === 'buscando' ? 'datos' : step === 'verificando' ? 'selfie' : step
  const stepIndex = steps.indexOf(visibleStep)

  return (
    <div className="flex flex-col gap-6">
      <ol aria-label="Pasos" className="flex gap-1.5">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === stepIndex ? 'step' : undefined} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-olympic-blue' : 'bg-olympic-white/15'}`}>
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>

      {step === 'datos' || step === 'buscando' ? (
        <form onSubmit={handleSearch} noValidate className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-olympic-white/70">
            Con tu nombre, país y disciplina te buscamos en la web. Si aparecés, armamos tu perfil con lo que encontremos.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Field label="Apellido" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
            <Field label="País" list="signup-countries" value={form.country} onChange={set('country')} error={errors.country} />
            <Field label="Disciplina" list="signup-disciplines" value={form.discipline} onChange={set('discipline')} error={errors.discipline} />
          </div>
          <datalist id="signup-countries">
            {countries.map((c) => <option key={c} value={c} />)}
          </datalist>
          <datalist id="signup-disciplines">
            {disciplines.map((d) => <option key={d} value={d} />)}
          </datalist>
          <hr className="border-olympic-white/10" />
          <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
            <Field label="Repetir contraseña" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          </div>
          <button type="submit" disabled={step === 'buscando'} className="inline-flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white disabled:opacity-60">
            {step === 'buscando' ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {step === 'buscando' ? 'Buscándote en la web…' : 'Buscarme'}
          </button>
        </form>
      ) : null}

      {step === 'candidatos' ? (
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-2xl font-semibold">
            {candidates.length ? '¿Sos alguno de estos?' : 'No te encontramos en la web'}
          </h3>
          {candidates.length ? (
            <ul className="flex flex-col gap-3">
              {candidates.map((c) => (
                <li key={c.url} className="flex gap-4 rounded-xl border border-olympic-white/15 bg-olympic-white/5 p-3">
                  <img src={c.image!} alt={c.title} referrerPolicy="no-referrer" className="size-24 shrink-0 rounded-lg object-cover object-top" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="font-bold">{c.title}</p>
                    <p className="line-clamp-3 text-sm leading-relaxed text-olympic-white/70">{c.description}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setChosen(c)
                          setVerifyNote(null)
                          setStep('selfie')
                        }}
                        className="rounded-full bg-olympic-blue px-4 py-1.5 text-sm font-bold text-olympic-white"
                      >
                        Soy yo
                      </button>
                      <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-olympic-white/60 hover:text-olympic-white">
                        Fuente <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-olympic-white/70">
              No pasa nada: la mayoría de los deportistas que buscan sponsor todavía no están en la web. Armemos tu perfil desde cero.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep('datos')} className="inline-flex items-center gap-2 rounded-full border border-olympic-white/30 px-4 py-2.5 text-sm font-semibold">
              <ArrowLeft className="size-4" /> Corregir datos
            </button>
            <button type="button" onClick={continueWithoutMatch} className="inline-flex items-center gap-2 rounded-full bg-olympic-white px-4 py-2.5 text-sm font-bold text-olympic-black">
              <UserX className="size-4" /> {candidates.length ? 'No soy ninguno, completar perfil' : 'Completar mi perfil'}
            </button>
          </div>
        </div>
      ) : null}

      {(step === 'selfie' || step === 'verificando') && chosen ? (
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-2xl font-semibold">Confirmá que sos vos</h3>
          <div className="flex items-center gap-3 rounded-xl border border-olympic-white/15 p-3">
            <img src={chosen.image!} alt={chosen.title} referrerPolicy="no-referrer" className="size-14 rounded-full object-cover object-top" />
            <p className="text-sm leading-relaxed text-olympic-white/70">
              Sacate una selfie de frente y con buena luz. La comparamos con la foto pública de <strong className="text-olympic-white">{chosen.title}</strong>.
            </p>
          </div>
          {verifyNote ? (
            <div role="alert" className="flex gap-3 rounded-xl border border-olympic-red/60 bg-olympic-red/10 p-3 text-sm leading-relaxed">
              <ShieldAlert className="size-5 shrink-0 text-olympic-red" />
              <div className="flex flex-col gap-2">
                <p>{verifyNote}</p>
                <button type="button" onClick={continueWithoutMatch} className="w-fit font-bold underline underline-offset-4">
                  Seguir sin verificar y completar mi perfil
                </button>
              </div>
            </div>
          ) : null}
          {step === 'verificando' ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-olympic-white/70" aria-live="polite">
              <Loader2 className="size-5 animate-spin" /> Comparando tu selfie y armando tu perfil…
            </p>
          ) : (
            <SelfieCapture onCapture={handleSelfie} />
          )}
          <button type="button" onClick={() => setStep('candidatos')} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-olympic-white/70">
            <ArrowLeft className="size-4" /> Volver a los resultados
          </button>
        </div>
      ) : null}

      {step === 'perfil' && profile ? (
        <AthleteProfileForm initial={profile} pending={pending} error={error} onSubmit={handleCreate} />
      ) : null}

      {step !== 'perfil' ? <FormError message={error} /> : null}
    </div>
  )
}
