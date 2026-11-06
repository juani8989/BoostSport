'use client'

import useSWR from 'swr'
import { Handshake, Loader2, MessageCircle } from 'lucide-react'
import { getMatches } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, timeAgo } from '@/components/app/kit'
import { load } from '@/lib/load'

export function Inbox() {
  const nav = useNav()
  const { data, isLoading } = useSWR('matches', () => load('getMatches'), { refreshInterval: 8000 })

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-24 pt-20">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-3xl font-semibold">Mensajes</h1>
        <p className="text-sm text-muted-foreground">Tus matches y acuerdos de patrocinio.</p>
      </header>

      {isLoading ? (
        <Loader2 className="mx-auto mt-10 size-6 animate-spin text-muted-foreground" aria-label="Cargando mensajes" />
      ) : !data?.length ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <MessageCircle className="size-8 text-olympic-blue" />
          <p className="font-display text-2xl font-semibold">Todavía no hay matches</p>
          <p className="max-w-64 text-sm text-muted-foreground">Cuando vos y una {nav.role === 'deportista' ? 'empresa' : 'persona deportista'} se elijan, la conversación aparece acá.</p>
          <button type="button" onClick={() => nav.goTo('match')} className="rounded-full bg-olympic-blue px-5 py-2.5 text-sm font-bold text-olympic-white">
            Ir a Match
          </button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {data.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => nav.openChat(m.id)} className="flex w-full items-center gap-3 border-b border-border py-3 text-left">
                <PartyAvatar party={m.other} className="size-12" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{m.other.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.lastAt)}</span>
                  </span>
                  <span className="truncate text-sm text-muted-foreground">{m.lastMessage}</span>
                </span>
                {m.dealStatus === 'aceptada' ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-olympic-green px-2 py-1 text-[11px] font-bold text-olympic-white">
                    <Handshake className="size-3.5" />
                    Acuerdo
                  </span>
                ) : m.dealStatus === 'pendiente' ? (
                  <span className="shrink-0 rounded-full bg-olympic-yellow px-2 py-1 text-[11px] font-bold text-olympic-black">Propuesta</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
