'use client'

import { useDeferredValue, useState } from 'react'
import useSWR from 'swr'
import { Handshake, Loader2, MessageCircle, Search, SquarePen, X } from 'lucide-react'
import type { MatchSummary } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, timeAgo } from '@/components/app/kit'
import { NewChatSheet } from '@/components/messages/new-chat'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function Inbox({ activeId, onOpen }: { activeId: number | null; onOpen: (matchId: number, messageId?: number) => void }) {
  const nav = useNav()
  const { data, isLoading } = useSWR('matches', () => load('getMatches'), { refreshInterval: 8000 })
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const q = useDeferredValue(query.trim())
  const searching = q.length >= 2

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-20 md:pt-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-3xl font-semibold">Mensajes</h1>
            <p className="text-sm text-muted-foreground">Tus chats, matches y acuerdos.</p>
          </div>
          <button
            type="button"
            onClick={() => setComposing(true)}
            aria-label="Nuevo mensaje"
            title="Nuevo mensaje"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-olympic-blue text-olympic-white"
          >
            <SquarePen className="size-[18px]" />
          </button>
        </header>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="inbox-search" className="sr-only">
            Buscar en mensajes
          </label>
          <input
            id="inbox-search"
            type="search"
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Buscar personas o mensajes"
            className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-10 text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-secondary">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 md:pb-6">
        {searching ? (
          <SearchResults q={q} chats={data ?? []} activeId={activeId} onOpen={onOpen} />
        ) : isLoading ? (
          <Loader2 className="mx-auto mt-10 size-6 animate-spin text-muted-foreground" aria-label="Cargando mensajes" />
        ) : !data?.length ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <MessageCircle className="size-8 text-olympic-blue" />
            <p className="font-display text-2xl font-semibold">Todavía no hay chats</p>
            <p className="max-w-72 text-sm text-muted-foreground">
              Escribile a alguien que seguís, o hacé match con una {nav.role === 'deportista' ? 'empresa' : 'persona deportista'} y la conversación aparece acá.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setComposing(true)} className="rounded-full bg-olympic-blue px-5 py-2.5 text-sm font-bold text-olympic-white">
                Nuevo mensaje
              </button>
              <button type="button" onClick={() => nav.goTo('match')} className="rounded-full bg-secondary px-5 py-2.5 text-sm font-bold">
                Ir a Match
              </button>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col">
            {data.map((m) => (
              <li key={m.id}>
                <ChatRow chat={m} active={m.id === activeId} onClick={() => onOpen(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {composing ? (
        <NewChatSheet
          onClose={() => setComposing(false)}
          onOpen={(id) => {
            setComposing(false)
            setQuery('')
            onOpen(id)
          }}
        />
      ) : null}
    </div>
  )
}

function ChatRow({ chat, active, onClick }: { chat: MatchSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn('-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-secondary/60', active && 'bg-secondary')}
    >
      <PartyAvatar party={chat.other} className="size-12" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{chat.other.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(chat.lastAt)}</span>
        </span>
        <span className="truncate text-sm text-muted-foreground">{chat.lastMessage}</span>
      </span>
      {chat.dealStatus === 'aceptada' ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-olympic-green px-2 py-1 text-[11px] font-bold text-olympic-white">
          <Handshake className="size-3.5" />
          Acuerdo
        </span>
      ) : chat.dealStatus === 'pendiente' ? (
        <span className="shrink-0 rounded-full bg-olympic-yellow px-2 py-1 text-[11px] font-bold text-olympic-black">Propuesta</span>
      ) : null}
    </button>
  )
}

function SearchResults({ q, chats, activeId, onOpen }: { q: string; chats: MatchSummary[]; activeId: number | null; onOpen: (matchId: number, messageId?: number) => void }) {
  const { data: hits, isLoading } = useSWR(['searchMessages', q], () => load('searchMessages', q), { keepPreviousData: true })
  const people = chats.filter((c) => normalize(c.other.name).includes(normalize(q)))

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {people.length ? (
        <section className="flex flex-col">
          <h2 className="pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Chats</h2>
          <ul className="flex flex-col">
            {people.map((m) => (
              <li key={m.id}>
                <ChatRow chat={m} active={m.id === activeId} onClick={() => onOpen(m.id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col">
        <h2 className="pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Mensajes</h2>
        {isLoading && !hits ? (
          <Loader2 className="mx-auto mt-4 size-5 animate-spin text-muted-foreground" aria-label="Buscando" />
        ) : !hits?.length ? (
          <p className="py-3 text-sm text-muted-foreground">No hay mensajes con “{q}”.</p>
        ) : (
          <ul className="flex flex-col">
            {hits.map((h) => (
              <li key={h.messageId}>
                <button
                  type="button"
                  onClick={() => onOpen(h.matchId, h.messageId)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-secondary/60"
                >
                  <PartyAvatar party={h.other} className="size-10" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{h.other.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(h.createdAt)}</span>
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {h.mine ? 'Vos: ' : ''}
                      <Highlight text={snippet(h.body, q)} q={q} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Keeps the part of a long message around the first match. */
function snippet(text: string, q: string) {
  const at = normalize(text).indexOf(normalize(q))
  if (at < 40) return text
  return `…${text.slice(at - 30)}`
}

function Highlight({ text, q }: { text: string; q: string }) {
  const at = normalize(text).indexOf(normalize(q))
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-olympic-yellow/70 px-0.5 text-foreground">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  )
}
