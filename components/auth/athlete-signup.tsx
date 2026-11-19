'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BadgeCheck, Camera, Check, ExternalLink, IdCard, Loader2, Search, ShieldCheck, UserX, X } from 'lucide-react'
import { AuthError, registerAccount, type AthleteProfile, type PendingVerification } from '@/lib/auth-store'
import { countries, disciplines } from '@/lib/roles'
import { Field, FormError, validateCredentials } from '@/components/auth/field'
import { SelfieCapture } from '@/components/auth/selfie-capture'
import { AthleteProfileForm } from '@/components/auth/athlete-profile-form'
import { CheckEmail } from '@/components/auth/check-email'
import { compressImage } from '@/components/app/kit'
import type { ResearchResult } from '@/app/api/athlete-research/route'

/**
 * Athlete sign-up, in this order:
 * 1. Name, last name, country and sport. As soon as they're filled we look them up on the web.
 * 2. "¿Sos esta persona?" If yes, everything we found, to review and complete.
 * 3. Email and password for the account.
 * 4. Identity: a selfie (and, optionally, an ID photo, which makes the review faster).
 * An admin reviews it; the tilde azul only appears once they approve.
 */

type Step = 'datos' | 'perfil' | 'cuenta' | 'identidad'
const steps: { id: Step; label: string }[] = [
  { id: 'datos', label: 'Tus datos' },
  { id: 'perfil', label: 'Tu perfil' },
  { id: 'cuenta', label: 'Tu cuenta' },
  { id: 'identidad', label: 'Verificación' },
]

type Research = { key: string; status: 'searching' | 'done' | 'error'; result?: ResearchResult }

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

/** Only Wikipedia's photos are free to reuse as a profile picture; press photos belong to the outlet. */
const isFreePhoto = (url?: string) => !!url && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(url)

export function AthleteSignup() {
  const [step, setStep] = useState<Step>('datos')
  const [form, setForm] = useState({ firstName: '', lastName: '', country: '', discipline: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [research, setResearch] = useState<Research | null>(null)
  const [claimed, setClaimed] = useState(false)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [document, setDocument] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [verification, setVerification] = useState<PendingVerification | null>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    // A field's error goes away as soon as the person edits that field.
    setErrors(({ [key]: _, ...rest }) => rest)
  }
  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
  const ready = form.firstName.trim().length >= 2 && form.lastName.trim().length >= 2 && !!form.country.trim() && !!form.discipline.trim()
  const key = ready ? [fullName, form.country.trim(), form.discipline.trim()].join('|').toLowerCase() : ''

  // As soon as the four fields are filled (and the person stops typing for a moment), we look them up.
  const latest = useRef('')
  useEffect(() => {
    if (!key || step !== 'datos') return
    if (research?.key === key) return
    const t = setTimeout(async () => {
      latest.current = key
      setClaimed(false)
      setResearch({ key, status: 'searching' })
      try {
        const params = new URLSearchParams({ name: fullName, discipline: form.discipline.trim(), country: form.country.trim() })
        const res = await fetch(`/api/athlete-research?${params}`)
        const result = res.ok ? ((await res.json()) as ResearchResult) : undefined
        if (latest.current === key) setResearch({ key, status: result ? 'done' : 'error', result })
      } catch {
        if (latest.current === key) setResearch({ key, status: 'error' })
      }
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, step])

  const current = research?.key === key ? research : null
  const found = current?.status === 'done' && current.result?.found ? current.result : null

  function validateDatos() {
    const next: Record<string, string> = {}
    if (form.firstName.trim().length < 2) next.firstName = 'Ingresá tu nombre.'
    if (form.lastName.trim().length < 2) next.lastName = 'Ingresá tu apellido.'
    if (!form.country.trim()) next.country = 'Elegí tu país.'
    if (!form.discipline.trim()) next.discipline = 'Elegí tu disciplina.'
    setErrors(next)
    return !Object.keys(next).length
  }

  /** "Sí, soy yo": the profile starts with everything found, ready to review. */
  function claim(r: ResearchResult) {
    setClaimed(true)
    setProfile({
      ...emptyProfile(form.firstName.trim(), form.lastName.trim(), form.country.trim(), form.discipline.trim()),
      famous: true,
      photo: isFreePhoto(r.photos[0]) ? r.photos[0] : undefined,
      wikiUrl: r.wikiUrl,
      summary: r.summary,
      age: r.age,
      club: r.club,
      achievements: r.achievements.join('\n'),
      timeline: r.timeline.length ? r.timeline : [{ year: '', text: '' }],
      press: r.press,
      socials: { instagram: r.socials.instagram, tiktok: '', x: '', youtube: '' },
    })
    setStep('perfil')
  }

  function startFromScratch() {
    if (!validateDatos()) return
    setClaimed(false)
    setProfile(emptyProfile(form.firstName.trim(), form.lastName.trim(), form.country.trim(), form.discipline.trim()))
    setStep('perfil')
  }

  function submitCuenta(e: React.FormEvent) {
    e.preventDefault()
    const next = validateCredentials(form.email, form.password, form.confirm)
    setErrors(next)
    if (!Object.keys(next).length) setStep('identidad')
  }

  async function pickDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setDocument(await compressImage(file, 1400, 0.8))
    } catch {
      setError('No pudimos leer esa foto. Probá con otra.')
    }
  }

  async function create() {
    if (!profile || !selfie) return
    setPending(true)
    setError(null)
    try {
      const sent = await registerAccount({
        role: 'deportista',
        email: form.email,
        password: form.password,
        name: `${profile.firstName} ${profile.lastName}`,
        profile,
        identity: {
          selfie,
          document: document ?? undefined,
          claimed,
          photos: claimed && found ? found.photos : [],
          sources: claimed && found ? found.sources : [],
          official: claimed && found ? found.official : [],
        },
      })
      setVerification(sent)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No pudimos crear el usuario.')
    }
    setPending(false)
  }

  if (verification) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex gap-3 rounded-xl border border-olympic-blue/50 bg-olympic-blue/10 p-4 text-sm leading-relaxed">
          <ShieldCheck className="size-5 shrink-0 text-olympic-blue" />
          Recibimos tu verificación. Ya podés usar la app; el tilde azul aparece cuando el equipo de BoostSport revise tu identidad{document ? ' (con tu DNI suele ser en el día)' : ''}.
        </p>
        <CheckEmail pending={verification} onBack={() => setVerification(null)} />
      </div>
    )
  }

  const stepIndex = steps.findIndex((s) => s.id === step)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ol aria-label="Pasos del registro" className="flex gap-1.5">
          {steps.map((s, i) => (
            <li key={s.id} aria-current={i === stepIndex ? 'step' : undefined} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-olympic-blue' : 'bg-olympic-white/15'}`}>
              <span className="sr-only">
                Paso {i + 1} de {steps.length}: {s.label}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs font-semibold text-olympic-white/60">
          Paso {stepIndex + 1} de {steps.length} · {steps[stepIndex].label}
        </p>
      </div>

      {step === 'datos' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-olympic-white/70">
            Contanos quién sos. Mientras completás, te buscamos en la web (prensa, federaciones, videos) para armar tu perfil con lo que ya se sabe de vos.
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

          <div aria-live="polite">
            {!ready ? null : !current || current.status === 'searching' ? (
              <p className="flex items-center gap-2 rounded-xl border border-olympic-white/15 bg-olympic-white/5 p-4 text-sm text-olympic-white/80">
                <Loader2 className="size-4 shrink-0 animate-spin" /> Buscando a {fullName} en la web: prensa, federaciones, Wikipedia y videos…
              </p>
            ) : found ? (
              <Candidate result={found} onYes={() => claim(found)} onNo={startFromScratch} />
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-olympic-white/15 bg-olympic-white/5 p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <Search className="size-4" /> {current.status === 'error' ? 'No pudimos buscarte ahora' : 'No te encontramos en la web'}
                </p>
                <p className="text-sm leading-relaxed text-olympic-white/70">
                  No pasa nada: la mayoría de los deportistas que buscan sponsor todavía no están en la web. Armemos tu perfil desde cero.
                </p>
                <button type="button" onClick={startFromScratch} className="w-fit rounded-full bg-olympic-blue px-5 py-2.5 text-sm font-bold text-olympic-white">
                  Armar mi perfil
                </button>
              </div>
            )}
          </div>
          {!ready ? (
            <button type="button" onClick={validateDatos} className="rounded-full bg-olympic-white/10 px-5 py-3 text-sm font-bold text-olympic-white/70">
              Completá los cuatro datos para buscarte
            </button>
          ) : null}
        </div>
      ) : null}

      {step === 'perfil' && profile ? (
        <div className="flex flex-col gap-4">
          {claimed && found ? <Sources result={found} /> : null}
          <AthleteProfileForm
            initial={profile}
            pending={false}
            error={null}
            submitLabel="Seguir"
            pendingLabel="Seguir"
            onSubmit={(next) => {
              setProfile(next)
              setStep('cuenta')
            }}
          />
          <button type="button" onClick={() => setStep('datos')} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-olympic-white/70">
            <ArrowLeft className="size-4" /> Volver a mis datos
          </button>
        </div>
      ) : null}

      {step === 'cuenta' ? (
        <form onSubmit={submitCuenta} noValidate className="flex flex-col gap-4">
          <h3 className="font-display text-2xl font-semibold">{claimed ? `¡Hola, ${form.firstName.trim()}!` : 'Creá tu cuenta'}</h3>
          <p className="text-sm leading-relaxed text-olympic-white/70">
            Ingresá tu mail y una contraseña. Te mandamos un link para confirmar que el mail es tuyo; después verificamos que seas {fullName}.
          </p>
          <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
            <Field label="Repetir contraseña" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          </div>
          <button type="submit" className="rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white">
            Seguir
          </button>
          <button type="button" onClick={() => setStep('perfil')} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-olympic-white/70">
            <ArrowLeft className="size-4" /> Volver a mi perfil
          </button>
        </form>
      ) : null}

      {step === 'identidad' ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-2xl font-semibold">Verificá que sos vos</h3>
            <p className="text-sm leading-relaxed text-olympic-white/70">
              Así las marcas saben que el perfil es real. Las fotos solo las ve el equipo de BoostSport para revisar tu identidad y se borran después de la revisión.
            </p>
          </div>

          <section className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <Camera className="size-4 text-olympic-blue" /> 1. Una selfie <span className="font-normal text-olympic-white/60">(obligatoria)</span>
            </h4>
            {selfie ? (
              <div className="flex items-center gap-3 rounded-xl border border-olympic-green/50 bg-olympic-green/10 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfie} alt="Tu selfie" className="size-16 rounded-lg object-cover" />
                <p className="flex-1 text-sm font-semibold">Selfie lista</p>
                <button type="button" onClick={() => setSelfie(null)} className="text-sm font-semibold text-olympic-white/70 underline underline-offset-4">
                  Sacar otra
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-olympic-white/60">De frente, con buena luz y sin anteojos de sol.</p>
                <SelfieCapture onCapture={setSelfie} />
              </>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <IdCard className="size-4 text-olympic-yellow" /> 2. Foto de tu DNI <span className="font-normal text-olympic-white/60">(opcional)</span>
            </h4>
            <p className="rounded-lg bg-olympic-yellow/10 px-3 py-2 text-xs leading-relaxed text-olympic-yellow">
              Con la foto del frente de tu DNI la verificación es mucho más rápida: comparamos tu cara y tu nombre al instante.
            </p>
            {document ? (
              <div className="flex items-center gap-3 rounded-xl border border-olympic-green/50 bg-olympic-green/10 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={document} alt="Tu DNI" className="h-16 w-24 rounded-lg object-cover" />
                <p className="flex-1 text-sm font-semibold">DNI cargado</p>
                <button type="button" onClick={() => setDocument(null)} aria-label="Quitar la foto del DNI" className="flex size-8 items-center justify-center rounded-full hover:bg-olympic-white/10">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-olympic-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-olympic-white/10">
                <IdCard className="size-4" /> Subir foto del DNI
                <input type="file" accept="image/*" capture="environment" onChange={pickDocument} className="sr-only" />
              </label>
            )}
          </section>

          <FormError message={error} />
          <button type="button" onClick={create} disabled={!selfie || pending} className="inline-flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white disabled:opacity-50">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {pending ? 'Creando tu cuenta…' : selfie ? 'Crear mi cuenta y enviar a revisión' : 'Sacate la selfie para seguir'}
          </button>
          <button type="button" onClick={() => setStep('cuenta')} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-olympic-white/70">
            <ArrowLeft className="size-4" /> Volver
          </button>
        </div>
      ) : null}

      {step === 'datos' ? <FormError message={error} /> : null}
    </div>
  )
}

/** "¿Sos esta persona?": the best match found on the web, with a yes / no. */
function Candidate({ result, onYes, onNo }: { result: ResearchResult; onYes: () => void; onNo: () => void }) {
  const photo = result.photos[0]
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-olympic-blue bg-olympic-blue/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-olympic-blue">¿Sos esta persona?</p>
      <div className="flex gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" referrerPolicy="no-referrer" className="size-24 shrink-0 rounded-lg object-cover object-top" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-xl font-semibold leading-tight">{result.name}</p>
          <p className="text-sm text-olympic-white/70">
            {[result.discipline, result.club, result.country].filter(Boolean).join(' · ')}
          </p>
          {result.official.length ? (
            <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-olympic-yellow">
              <BadgeCheck className="size-3.5" /> Figura en {result.official.map((o) => o.source).join(' y ')}
            </p>
          ) : null}
          {result.summary ? <p className="line-clamp-4 text-sm leading-relaxed text-olympic-white/80">{result.summary}</p> : null}
          <p className="text-xs text-olympic-white/50">
            Encontramos {result.sources.length} {result.sources.length === 1 ? 'fuente' : 'fuentes'}
            {result.press.length ? ` y ${result.press.length} notas o videos` : ''}.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onYes} className="inline-flex items-center gap-2 rounded-full bg-olympic-blue px-5 py-2.5 text-sm font-bold text-olympic-white">
          <Check className="size-4" /> Sí, soy yo
        </button>
        <button type="button" onClick={onNo} className="inline-flex items-center gap-2 rounded-full border border-olympic-white/30 px-5 py-2.5 text-sm font-semibold">
          <UserX className="size-4" /> No soy yo
        </button>
      </div>
    </div>
  )
}

/** Where each fact came from, above the profile they're reviewing. */
function Sources({ result }: { result: ResearchResult }) {
  return (
    <details className="rounded-xl border border-olympic-white/15 bg-olympic-white/5 p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <BadgeCheck className="size-4 text-olympic-blue" /> Esto encontramos sobre vos ({result.sources.length} fuentes). Revisá, corregí y completá lo que falte.
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {result.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-olympic-white/80 hover:text-olympic-white">
              <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {s.title} <span className="text-olympic-white/50">· {s.source}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
