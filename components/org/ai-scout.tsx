'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { aiScout, type ScoutResult } from '@/app/actions/org'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { InviteButton } from '@/components/org/invite-button'

const DEFAULT_BRIEF = 'Deportistas que necesiten sponsor de indumentaria, equipamiento o viajes.'

/** Starts from what the brand wrote it looks for, so the first search fits its own sport. */
export function AiScout({ lookingFor }: { lookingFor?: string }) {
  const nav = useNav()
  const [brief, setBrief] = useState(lookingFor?.trim() || DEFAULT_BRIEF)
  const [results, setResults] = useState<ScoutResult[] | null>(null)
  const [usedAi, setUsedAi] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    const res = await aiScout(brief)
    setLoading(false)
    if (!res.ok) return setError(res.error)
    setResults(res.results)
    setUsedAi(res.usedAi)
  }

  function markInvited(key: string) {
    run()
    setResults((prev) => prev?.map((r) => (r.party.key === key ? { ...r, invited: true } : r)) ?? null)
  }

  return (
    <section aria-labelledby="scout-title" className="flex flex-col gap-3 rounded-3xl border border-olympic-blue/40 bg-olympic-blue/10 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-olympic-blue" aria-hidden />
        <h2 id="scout-title" className="font-display text-xl font-semibold">
          Scout con IA
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">Describí a quién buscás y la IA filtra y ordena a los deportistas que encajan con tu marca.</p>
      <label htmlFor="scout-brief" className="sr-only">
        Qué perfil buscás
      </label>
      <textarea
        id="scout-brief"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        maxLength={400}
        className="resize-none rounded-xl border border-border bg-input p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue py-3 text-sm font-bold text-olympic-white disabled:opacity-60"
      >
        <Sparkles className="size-4" />
        {loading ? 'Analizando perfiles…' : 'Filtrar con IA'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-olympic-red">
          {error}
        </p>
      ) : null}

      {results ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {results.length} {results.length === 1 ? 'candidato' : 'candidatos'}
            {usedAi ? '' : ' · filtro básico'}
          </p>
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.party.key} className="flex flex-col gap-2 rounded-2xl bg-card p-3">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => nav.openProfile(r.party.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <PartyAvatar party={r.party} className="size-11 shrink-0" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-bold">{r.party.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{r.party.subtitle}</span>
                    </span>
                  </button>
                  <span className="shrink-0 rounded-full bg-metal-gold px-2.5 py-1 font-mono text-xs font-semibold text-[#0a0a0a]">{r.score}</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
                {r.needs.length ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Necesita">
                    {r.needs.map((n) => (
                      <li key={n} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                        {n}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex justify-end">
                  <InviteButton candidate={r} onInvited={() => markInvited(r.party.key)} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
