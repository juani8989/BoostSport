'use client'

import { useDeferredValue, useState } from 'react'
import useSWR from 'swr'
import { Search } from 'lucide-react'
import { searchPeople, type SearchRole } from '@/app/actions/org'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { InviteButton } from '@/components/org/invite-button'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

const labels: Record<SearchRole, string> = { deportista: 'Deportistas', empresa: 'Sponsors', evento: 'Eventos' }

export function PeopleSearch({ roles }: { roles: SearchRole[] }) {
  const nav = useNav()
  const [role, setRole] = useState<SearchRole>(roles[0])
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const { data, isLoading, mutate } = useSWR(['people', role, deferred], () => load('searchPeople', deferred, role), { keepPreviousData: true })

  return (
    <section aria-labelledby="search-title" className="flex flex-col gap-3">
      <h2 id="search-title" className="font-display text-xl font-semibold">
        Buscar e invitar
      </h2>
      <div role="tablist" aria-label="Tipo de perfil" className="flex gap-2">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => setRole(r)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-bold transition-colors',
              role === r ? 'bg-foreground text-background' : 'bg-secondary text-secondary-foreground',
            )}
          >
            {labels[r]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 rounded-full border border-border bg-input px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">Buscar por nombre, disciplina o ciudad</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, disciplina o ciudad…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      <ul className="flex flex-col gap-2" aria-busy={isLoading}>
        {data?.map((c) => (
          <li key={c.party.key} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <button
              type="button"
              disabled={c.party.role !== 'deportista'}
              onClick={() => nav.openProfile(c.party.key)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <PartyAvatar party={c.party} className="size-11 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold">{c.party.name}</span>
                <span className="truncate text-xs text-muted-foreground">{c.party.subtitle}</span>
              </span>
            </button>
            <InviteButton candidate={c} onInvited={() => mutate()} />
          </li>
        ))}
        {data && data.length === 0 ? <li className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground">Sin resultados.</li> : null}
      </ul>
    </section>
  )
}
