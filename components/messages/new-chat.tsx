'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ChevronRight, Loader2, Search, UserRound } from 'lucide-react'
import { startChat } from '@/app/actions/chat'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { load } from '@/lib/load'

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** "Nuevo mensaje": pick someone you follow (or who follows you) and open a chat with them. */
export function NewChatSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (matchId: number) => void }) {
  const { data, isLoading } = useSWR('contacts', () => load('getContacts'))
  const [query, setQuery] = useState('')
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const q = normalize(query.trim())
  const list = (data ?? []).filter((c) => !q || normalize(c.party.name).includes(q) || normalize(c.party.subtitle).includes(q))

  async function open(key: string, matchId: number | null) {
    if (matchId) return onOpen(matchId)
    setOpening(key)
    setError(null)
    const res = await startChat(key)
    setOpening(null)
    if (res.ok) onOpen(res.matchId)
    else setError(res.error)
  }

  return (
    <Sheet title="Nuevo mensaje" onClose={onClose} modal>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="new-chat-search" className="sr-only">
            Buscar a quién escribirle
          </label>
          <input
            id="new-chat-search"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar entre quienes seguís"
            className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <Loader2 className="mx-auto mt-6 size-6 animate-spin text-muted-foreground" aria-label="Cargando contactos" />
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <UserRound className="size-7 text-muted-foreground" />
            <p className="font-semibold">Todavía no seguís a nadie</p>
            <p className="max-w-64 text-sm text-muted-foreground">Seguí a deportistas, marcas o eventos y vas a poder escribirles desde acá.</p>
          </div>
        ) : !list.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No encontramos a nadie con ese nombre.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {list.map((c) => {
              const disabled = !!c.blockedReason
              return (
                <li key={c.party.key}>
                  <button
                    type="button"
                    disabled={disabled || opening !== null}
                    onClick={() => open(c.party.key, c.matchId)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PartyAvatar party={c.party} className={disabled ? 'size-11 opacity-50' : 'size-11'} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={disabled ? 'truncate font-semibold text-muted-foreground' : 'truncate font-semibold'}>{c.party.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{c.blockedReason ?? (c.matchId ? 'Ya tienen un chat' : c.party.subtitle)}</span>
                    </span>
                    {opening === c.party.key ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Abriendo chat" />
                    ) : disabled ? null : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
