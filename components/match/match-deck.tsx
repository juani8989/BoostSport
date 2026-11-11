'use client'

import { useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Heart, Loader2, RotateCcw, Sparkles, User, X } from 'lucide-react'
import { getDeck, swipe, type DeckCard } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

const SWIPE_DISTANCE = 110

export function MatchDeck() {
  const nav = useNav()
  const { data, isLoading, mutate } = useSWR('deck', () => load('getDeck'))
  const [dragX, setDragX] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const [matched, setMatched] = useState<{ card: DeckCard; matchId?: number } | null>(null)
  const start = useRef<number | null>(null)

  const card = data?.[0]
  const next = data?.[1]

  async function decide(liked: boolean) {
    if (!card || leaving) return
    setLeaving(liked ? 'right' : 'left')
    const res = await swipe({ targetKey: card.key, liked })
    setTimeout(() => {
      mutate((prev) => prev?.slice(1), { revalidate: false })
      setLeaving(null)
      setDragX(0)
      if (res.ok && res.matched) {
        setMatched({ card, matchId: res.matchId })
        globalMutate('matches')
      }
    }, 220)
  }

  function onPointerDown(e: React.PointerEvent) {
    start.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (start.current === null) return
    setDragX(e.clientX - start.current)
  }
  function onPointerUp() {
    if (start.current === null) return
    start.current = null
    if (dragX > SWIPE_DISTANCE) decide(true)
    else if (dragX < -SWIPE_DISTANCE) decide(false)
    else setDragX(0)
  }

  const offset = leaving === 'right' ? 520 : leaving === 'left' ? -520 : dragX
  const isAthlete = nav.role === 'deportista'

  return (
    <div className="flex h-full flex-col gap-4 px-4 pb-24 pt-20">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-3xl font-semibold">Match</h1>
        <p className="text-sm text-muted-foreground">
          {isAthlete ? 'Deslizá a la derecha a las marcas que querés que te patrocinen.' : 'Deslizá a la derecha a los deportistas que querés como cara de tu marca.'}
        </p>
      </header>

      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando perfiles" />
          </div>
        ) : !card ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border text-center">
            <Sparkles className="size-8 text-olympic-yellow" />
            <p className="font-display text-2xl font-semibold">No hay más perfiles</p>
            <p className="max-w-60 text-sm text-muted-foreground">Actualizá para volver a ver los perfiles que pasaste y sumar más matches.</p>
            <button
              type="button"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true)
                await mutate(getDeck({ recycle: true }), { revalidate: false })
                setRefreshing(false)
              }}
              className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Actualizar
            </button>
          </div>
        ) : (
          <>
            {next ? <Card card={next} className="scale-95 opacity-60" /> : null}
            <Card
              card={card}
              style={{ transform: `translateX(${offset}px) rotate(${offset / 18}deg)`, transition: start.current === null ? 'transform 220ms ease-out' : 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              likeOpacity={Math.max(0, Math.min(1, offset / SWIPE_DISTANCE))}
              nopeOpacity={Math.max(0, Math.min(1, -offset / SWIPE_DISTANCE))}
              onOpenProfile={card.party.role === 'deportista' ? () => nav.openProfile(card.key) : undefined}
            />
          </>
        )}
      </div>

      {card ? (
        <div className="flex items-center justify-center gap-6">
          <button type="button" onClick={() => decide(false)} aria-label="Pasar" className="flex size-16 items-center justify-center rounded-full border-2 border-olympic-red text-olympic-red">
            <X className="size-7" />
          </button>
          <button type="button" onClick={() => decide(true)} aria-label="Me interesa" className="flex size-16 items-center justify-center rounded-full bg-olympic-green text-olympic-white">
            <Heart className="size-7 fill-current" />
          </button>
        </div>
      ) : null}

      {matched ? (
        <div role="dialog" aria-modal="true" aria-label="Nuevo match" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background/95 px-8 text-center">
          <p className="font-display text-5xl font-semibold leading-none text-olympic-yellow">¡Es un match!</p>
          <div className="flex items-center gap-3">
            {nav.account ? (
              <PartyAvatar
                party={{ name: nav.account.name, initials: nav.account.name.slice(0, 2).toUpperCase(), role: nav.role === 'invitado' ? 'deportista' : nav.role }}
                className="size-20"
              />
            ) : null}
            <PartyAvatar party={matched.card.party} className="size-20" />
          </div>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            Vos y {matched.card.party.name} se eligieron. Hablen y armen un acuerdo de patrocinio.
          </p>
          <div className="flex w-full flex-col gap-2">
            {matched.matchId ? (
              <button type="button" onClick={() => nav.openChat(matched.matchId!)} className="rounded-full bg-olympic-blue px-6 py-3 font-bold text-olympic-white">
                Ir al chat
              </button>
            ) : null}
            <button type="button" onClick={() => setMatched(null)} className="rounded-full bg-secondary px-6 py-3 font-bold">
              Seguir deslizando
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Card({
  card,
  className,
  style,
  likeOpacity = 0,
  nopeOpacity = 0,
  onOpenProfile,
  ...pointer
}: {
  card: DeckCard
  className?: string
  style?: React.CSSProperties
  likeOpacity?: number
  nopeOpacity?: number
  onOpenProfile?: () => void
} & Pick<React.HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>) {
  const details = card.company
    ? { title: 'Te ofrece', items: card.company.benefits }
    : { title: 'Necesita', items: card.athlete?.needs.length ? card.athlete.needs : ['A definir'] }

  return (
    <div
      {...pointer}
      style={style}
      className={cn('absolute inset-0 touch-none select-none overflow-hidden rounded-3xl bg-card', className)}
    >
      {card.party.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.party.image} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-secondary font-display text-8xl font-semibold text-muted-foreground">
          {card.party.initials}
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      <span style={{ opacity: likeOpacity }} className="absolute left-5 top-6 -rotate-12 rounded-lg border-4 border-olympic-green px-3 py-1 font-display text-3xl font-semibold text-olympic-green">
        Me interesa
      </span>
      <span style={{ opacity: nopeOpacity }} className="absolute right-5 top-6 rotate-12 rounded-lg border-4 border-olympic-red px-3 py-1 font-display text-3xl font-semibold text-olympic-red">
        Paso
      </span>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-olympic-yellow px-2.5 py-1 text-xs font-bold text-olympic-black">{card.affinity}% afinidad</span>
          {card.appliedToYou ? <span className="rounded-full bg-olympic-green px-2.5 py-1 text-xs font-bold text-olympic-white">Te eligió</span> : null}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="font-display text-4xl font-semibold leading-none">{card.party.name}</h2>
            <span className="text-sm text-muted-foreground">{card.party.subtitle}</span>
          </div>
          {onOpenProfile ? (
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onOpenProfile} aria-label={`Ver perfil de ${card.party.name}`} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70">
              <User className="size-5" />
            </button>
          ) : null}
        </div>
        {card.athlete?.goals ? <p className="line-clamp-2 text-sm leading-relaxed">{card.athlete.goals}</p> : null}
        {card.company ? <p className="line-clamp-2 text-sm leading-relaxed">{card.company.about}</p> : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{details.title}</span>
          <div className="flex flex-wrap gap-1.5">
            {details.items.slice(0, 4).map((i) => (
              <span key={i} className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold">
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
