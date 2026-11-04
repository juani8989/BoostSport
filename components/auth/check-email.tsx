'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, MailCheck, RotateCw } from 'lucide-react'
import { AuthError, resendVerificationEmail, type PendingVerification } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const RESEND_COOLDOWN = 30

/** Shown after sign-up (or a sign-in with an unconfirmed email) until the person opens the link. */
export function CheckEmail({ pending, accent = 'bg-olympic-blue text-olympic-white', onBack }: { pending: PendingVerification; accent?: string; onBack?: () => void }) {
  const [current, setCurrent] = useState(pending)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function resend() {
    setSending(true)
    setNote(null)
    try {
      setCurrent(await resendVerificationEmail(current.email))
      setNote({ tone: 'ok', text: 'Listo, te mandamos un mail nuevo.' })
      setCooldown(RESEND_COOLDOWN)
    } catch (error) {
      setNote({ tone: 'error', text: error instanceof AuthError ? error.message : 'No pudimos reenviar el mail.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div role="status" className="flex flex-col items-center gap-5 py-6 text-center animate-in fade-in duration-300">
      <span className={cn('flex size-16 items-center justify-center rounded-full', accent)}>
        <MailCheck className="size-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-2xl font-semibold">Revisá tu mail</h3>
        <p className="text-sm leading-relaxed text-olympic-white/70">
          Te mandamos un link a <strong className="text-olympic-white">{current.email}</strong> para confirmar que es tuyo. Tocá{' '}
          <strong className="text-olympic-white">Confirmar mi cuenta</strong> en el mail y vas a entrar directo a la app.
        </p>
        <p className="text-xs text-olympic-white/50">El link vence en 24 horas. Si no lo ves, buscalo en spam o promociones.</p>
      </div>

      {current.devLink ? (
        <a href={current.devLink} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-olympic-yellow/60 px-3 py-2 text-xs font-semibold text-olympic-yellow">
          <ExternalLink className="size-3.5" /> Abrir el link del mail (solo en desarrollo)
        </a>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={sending || cooldown > 0}
          className="inline-flex items-center gap-2 rounded-full border border-olympic-white/20 px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        >
          <RotateCw className={cn('size-4', sending && 'animate-spin')} />
          {cooldown > 0 ? `Reenviar mail en ${cooldown} s` : sending ? 'Reenviando…' : 'Reenviar mail'}
        </button>
        {note ? <p className={cn('text-sm', note.tone === 'ok' ? 'text-olympic-green' : 'text-olympic-red')}>{note.text}</p> : null}
        {onBack ? (
          <button type="button" onClick={onBack} className="text-sm text-olympic-white/60 underline underline-offset-4">
            Usar otro email
          </button>
        ) : null}
      </div>
    </div>
  )
}
