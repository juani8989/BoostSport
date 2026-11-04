'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AuthError, EmailNotVerifiedError, signIn, type PendingVerification, type Role } from '@/lib/auth-store'
import { pendingDevLink } from '@/app/actions/register'
import { roleConfig } from '@/lib/roles'
import { Field, FormError, validateCredentials } from '@/components/auth/field'
import { OrgSignup } from '@/components/auth/org-signup'
import { AthleteSignup } from '@/components/auth/athlete-signup'
import { CheckEmail } from '@/components/auth/check-email'
import { cn } from '@/lib/utils'

function SignInForm({ role }: { role: Role }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [verification, setVerification] = useState<PendingVerification | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validateCredentials(email, password)
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length) return
    setPending(true)
    try {
      await signIn(role, email, password)
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        // Sign-in already re-sent the link; show the same screen as after sign-up.
        setVerification({ email: error.email, devLink: await pendingDevLink(error.email) })
      } else {
        setFormError(error instanceof AuthError ? error.message : 'No pudimos ingresar. Probá de nuevo.')
      }
      setPending(false)
    }
  }

  if (verification) {
    return <CheckEmail pending={verification} accent={roleConfig[role].button} onBack={() => setVerification(null)} />
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <Field label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <FormError message={formError} />
      <button type="submit" disabled={pending} className={cn('rounded-full px-5 py-3 font-bold transition-opacity disabled:opacity-60', roleConfig[role].button)}>
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}

export function AuthPanel({ role, onClose }: { role: Role; onClose: () => void }) {
  const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in')
  const config = roleConfig[role]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="auth-title" className="fixed inset-0 z-50 flex overflow-y-auto bg-olympic-black text-olympic-white animate-in fade-in duration-300">
      <aside className={cn('hidden w-2/5 max-w-md flex-col justify-end p-10 md:flex', config.bg, config.text)}>
        <p className="font-display text-sm font-semibold tracking-[0.3em] opacity-70">¿Quién soy?</p>
        <p className="font-display text-6xl font-semibold leading-none text-balance">{config.label}</p>
        <p className="mt-3 text-lg leading-relaxed opacity-90">{config.tagline}</p>
      </aside>

      <section className="flex flex-1 justify-center px-5 py-8 md:px-10">
        <div className="flex w-full max-w-lg flex-col gap-6">
          <button type="button" onClick={onClose} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-olympic-white/70 hover:text-olympic-white">
            <ArrowLeft className="size-4" /> Cambiar perfil
          </button>

          <div className="flex flex-col gap-1">
            <span aria-hidden className={cn('h-1.5 w-10 rounded-full md:hidden', config.bg)} />
            <h2 id="auth-title" className="font-display text-4xl font-semibold">
              {view === 'sign-in' ? 'Ingresar' : 'Crear usuario'}
              <span className="block text-lg font-semibold normal-case tracking-normal text-olympic-white/60">{config.label}</span>
            </h2>
          </div>

          <div role="tablist" aria-label="Modo de acceso" className="flex rounded-full border border-olympic-white/15 p-1 text-sm font-semibold">
            {(['sign-in', 'sign-up'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn('flex-1 rounded-full px-4 py-2 transition-colors', view === v ? 'bg-olympic-white text-olympic-black' : 'text-olympic-white/70')}
              >
                {v === 'sign-in' ? 'Ya tengo usuario' : 'Soy nuevo'}
              </button>
            ))}
          </div>

          {view === 'sign-in' ? (
            <>
              <SignInForm role={role} />
              <p className="text-center text-sm text-olympic-white/60">
                ¿No tenés usuario?{' '}
                <button type="button" onClick={() => setView('sign-up')} className="font-bold text-olympic-white underline underline-offset-4">
                  Crealo acá
                </button>
              </p>
              {/* TODO: provisional, remove before launch. Exposes the admin login publicly. */}
              {role === 'evento' ? (
                <p className="mt-[40vh] rounded-lg border border-dashed border-olympic-white/20 p-4 font-mono text-sm text-olympic-white/70">
                  ADMIN: admin@boostsport.com
                  <br />
                  contra: admin123
                </p>
              ) : null}
            </>
          ) : role === 'deportista' ? (
            <AthleteSignup />
          ) : (
            <OrgSignup role={role} />
          )}
        </div>
      </section>
    </div>
  )
}
