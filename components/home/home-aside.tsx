'use client'

import useSWR from 'swr'
import { MessageCircle } from 'lucide-react'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

/**
 * Right column of Inicio on wide computers (xl and up), like Instagram's: who you are,
 * people to discover, and the small print. Phones and narrow screens don't show it.
 */
export function HomeAside({ meName, mePhoto, meSubtitle, onProfile }: { meName: string; mePhoto?: string; meSubtitle: string; onProfile: () => void }) {
  const nav = useNav()
  const { data } = useSWR('search-explore', () => load('getSearchExplore'))
  const people = (data?.suggested ?? []).slice(0, 5)

  return (
    <aside aria-label="Tu cuenta y sugerencias" className="hidden h-dvh w-[320px] shrink-0 flex-col gap-6 overflow-y-auto px-6 pt-10 xl:flex">
      <button type="button" onClick={onProfile} className="flex items-center gap-3 rounded-xl text-left">
        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display font-semibold">
          {mePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mePhoto} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span aria-hidden>{meName.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{meName}</span>
          <span className="truncate text-xs text-muted-foreground">{meSubtitle}</span>
        </span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-xs font-bold text-olympic-blue">Ver perfil</span>
      </button>

      {people.length ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Sugerencias para vos</h2>
            <button type="button" onClick={() => nav.goTo('buscar')} className="text-xs font-bold hover:text-muted-foreground">
              Ver todas
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {people.map((p) => (
              <li key={p.key} className="flex items-center gap-3">
                {/* The photo and the name open the profile too, not only "Ver". */}
                <button type="button" disabled={!p.openable} onClick={() => nav.openProfile(p.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                  <PartyAvatar party={p} className="size-11" />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.subtitle}</span>
                  </span>
                </button>
                {p.openable ? (
                  <button type="button" onClick={() => nav.openProfile(p.key)} aria-label={`Ver perfil de ${p.name}`} className="shrink-0 text-xs font-bold text-olympic-blue hover:text-foreground">
                    Ver
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">© {new Date().getFullYear()} BoostSport · Mostrá quién sos, obtené lo que merecés.</p>
    </aside>
  )
}

/** Floating "Mensajes" pill for computers, with the faces of your latest chats. */
export function MessagesPill({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const { data } = useSWR('matches', () => load('getMatches'), { refreshInterval: 30000 })
  const faces = (data ?? []).slice(0, 3)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'fixed bottom-6 right-6 z-[55] hidden items-center gap-3 rounded-full border border-border bg-card py-2.5 pl-5 pr-3 shadow-2xl transition-colors hover:bg-secondary md:flex',
        className,
      )}
    >
      <MessageCircle className="size-5" />
      <span className="text-sm font-bold">Mensajes</span>
      {faces.length ? (
        <span className="flex -space-x-2">
          {faces.map((m) => (
            <PartyAvatar key={m.id} party={m.other} className="size-7 text-[10px] ring-2 ring-card" />
          ))}
        </span>
      ) : null}
    </button>
  )
}
