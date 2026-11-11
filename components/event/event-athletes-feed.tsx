'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Search, UserRound } from 'lucide-react'
import { searchPeople, type Candidate } from '@/app/actions/org'
import { useNav } from '@/components/app/nav'
import { InviteButton } from '@/components/org/invite-button'
import { PartyAvatar } from '@/components/app/kit'
import { load } from '@/lib/load'

export function EventAthletesFeed() {
  const [query, setQuery] = useState('')
  const { data, isLoading, mutate } = useSWR(['event-athletes', query], ([, q]) => load('searchPeople', q, 'deportista'))

  return (
    <section aria-label="Deportistas para invitar" className="flex flex-col gap-4">
      <SearchBox value={query} onChange={setQuery} label="Buscar deportistas por disciplina, nombre o ciudad" />
      {isLoading && !data ? <p className="text-sm text-muted-foreground">Cargando deportistas…</p> : null}
      {data && !data.length ? <p className="text-sm text-muted-foreground">No encontramos deportistas con esa búsqueda.</p> : null}
      <ul className="flex flex-col gap-3">
        {data?.map((c) => (
          <li key={c.party.key}>
            <AthleteCard candidate={c} onChanged={() => mutate()} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function AthleteCard({ candidate, onChanged }: { candidate: Candidate; onChanged: () => void }) {
  const nav = useNav()
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-3">
        <PartyAvatar party={candidate.party} className="size-14 text-base" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold leading-tight">{candidate.party.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{candidate.party.subtitle}</p>
        </div>
      </div>
      {candidate.summary ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{candidate.summary}</p> : null}
      {candidate.needs.length ? (
        <ul aria-label="Necesita" className="flex flex-wrap gap-1.5">
          {candidate.needs.map((n) => (
            <li key={n} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
              {n}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => nav.openProfile(candidate.party.key)}
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
        >
          <UserRound className="size-3.5" />
          Ver perfil
        </button>
        <InviteButton candidate={candidate} onInvited={onChanged} />
      </div>
    </article>
  )
}

export function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-input px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
}
