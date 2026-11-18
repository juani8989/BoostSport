'use client'

import { useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { Zap } from 'lucide-react'
import type { Challenge, Company } from '@/lib/catalog'
import { swipe } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { Sheet } from '@/components/app/kit'

/**
 * Applying to a sponsor or event (a sample brand or a real account): the athlete writes why,
 * and it goes out as a Match "me interesa". Its own file so the sponsor feed and the real-org
 * cards can both use it without importing each other.
 */
export function ApplySheet({ company, challenge, onClose }: { company: Pick<Company, 'key' | 'name'>; challenge?: Challenge; onClose: () => void }) {
  const nav = useNav()
  const [pitch, setPitch] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ matched: boolean; matchId?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pitch.trim().length < 15) return setError('Contales en al menos 15 caracteres por qué sos la persona indicada.')
    setPending(true)
    setError(null)
    const res = await swipe({ targetKey: company.key, liked: true, pitch, challengeId: challenge?.id })
    setPending(false)
    if (!res.ok) return setError(res.error)
    setResult({ matched: res.matched, matchId: res.matchId })
    globalMutate('deck')
    globalMutate('matches')
  }

  return (
    <Sheet title={challenge ? challenge.title : `Postularme a ${company.name}`} onClose={onClose}>
      {result ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-olympic-green text-olympic-white">
            <Zap className="size-8" />
          </span>
          <h3 className="font-display text-3xl font-semibold">{result.matched ? '¡Es un match!' : 'Postulación enviada'}</h3>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {result.matched
              ? `${company.name} también quiere trabajar con vos. Ya tenés una propuesta esperando en Mensajes.`
              : `${company.name} va a revisar tu perfil. Te avisamos si hay match.`}
          </p>
          {result.matched && result.matchId ? (
            <button type="button" onClick={() => nav.openChat(result.matchId!)} className="rounded-full bg-olympic-blue px-6 py-3 font-bold text-olympic-white">
              Ver propuesta
            </button>
          ) : (
            <button type="button" onClick={onClose} className="rounded-full bg-secondary px-6 py-3 font-bold">
              Seguir explorando
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {challenge ? (
            <div className="flex flex-col gap-1 rounded-xl bg-secondary p-3 text-sm">
              <span className="leading-relaxed">{challenge.detail}</span>
              <span className="font-semibold text-olympic-green">Premio: {challenge.reward}</span>
            </div>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Tu pitch para {company.name}
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              maxLength={400}
              rows={4}
              placeholder="Soy… entreno… y con su apoyo lograría…"
              className="rounded-xl border border-input bg-background px-4 py-3 font-normal leading-relaxed"
            />
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">Tu perfil completo (logros, metas y lo que necesitás) se envía junto con la postulación.</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button type="submit" disabled={pending} className="rounded-full bg-olympic-yellow px-5 py-3 font-bold text-olympic-black disabled:opacity-60">
            {pending ? 'Enviando…' : 'Enviar postulación'}
          </button>
        </form>
      )}
    </Sheet>
  )
}
