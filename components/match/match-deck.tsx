'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Heart, Info, Loader2, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import { getDeck, swipe, type DeckCard } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { useCheer } from '@/components/app/cheer'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

/** How far (px) the card has to travel to count as a decision… */
const SWIPE_DISTANCE = 110
/** …or how fast (px/ms) a short flick has to be. */
const FLICK_SPEED = 0.55
const EXIT_MS = 320

type Drag = { x: number; y: number }
type Decision = 'like' | 'pass'

export function MatchDeck() {
  const nav = useNav()
  const { data, isLoading, mutate } = useSWR('deck', () => load('getDeck'))
  const [drag, setDrag] = useState<Drag>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<Decision | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [matched, setMatched] = useState<{ card: DeckCard; matchId?: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cheer, fireCheer] = useCheer()
  const [intro, setIntro] = useState(true)
  const pointer = useRef<{ x: number; y: number; t: number; grabTop: boolean; moved: boolean } | null>(null)
  const samples = useRef<{ x: number; t: number }[]>([])

  const card = data?.[0]
  const isAthlete = nav.role === 'deportista'

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const decide = useCallback(
    async (decision: Decision) => {
      if (!card || leaving) return
      const liked = decision === 'like'
      setLeaving(decision)
      setExpanded(false)
      navigator.vibrate?.(12)
      const res = await swipe({ targetKey: card.key, liked })
      setTimeout(() => {
        mutate((prev) => prev?.slice(1), { revalidate: false })
        setLeaving(null)
        setDrag({ x: 0, y: 0 })
        if (!res.ok) return setToast(res.error)
        if (res.matched) {
          setMatched({ card, matchId: res.matchId })
          fireCheer()
          globalMutate('matches')
        } else if (liked) setToast(`Le mostramos tu interés a ${card.party.name.split(' ')[0]}. Si te elige, se abre el chat.`)
      }, EXIT_MS)
    },
    [card, leaving, mutate, fireCheer],
  )

  // Keyboard on computers: ← pass, → like, ↑ details.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (matched || (e.target as HTMLElement)?.closest('input, textarea')) return
      if (e.key === 'ArrowLeft') decide('pass')
      else if (e.key === 'ArrowRight') decide('like')
      else if (e.key === 'ArrowUp') setExpanded((v) => !v)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (leaving) return
    const rect = e.currentTarget.getBoundingClientRect()
    pointer.current = { x: e.clientX, y: e.clientY, t: performance.now(), grabTop: e.clientY < rect.top + rect.height / 2, moved: false }
    samples.current = [{ x: e.clientX, t: performance.now() }]
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  function onPointerMove(e: React.PointerEvent) {
    const p = pointer.current
    if (!p) return
    const x = e.clientX - p.x
    const y = e.clientY - p.y
    if (Math.abs(x) + Math.abs(y) > 6) p.moved = true
    samples.current = [...samples.current.slice(-4), { x: e.clientX, t: performance.now() }]
    setDrag({ x, y })
  }
  function onPointerUp() {
    const p = pointer.current
    if (!p) return
    pointer.current = null
    setDragging(false)
    if (!p.moved) {
      setDrag({ x: 0, y: 0 })
      setExpanded((v) => !v)
      return
    }
    const s = samples.current
    const speed = s.length > 1 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0
    if (drag.x > SWIPE_DISTANCE || speed > FLICK_SPEED) decide('like')
    else if (drag.x < -SWIPE_DISTANCE || speed < -FLICK_SPEED) decide('pass')
    else setDrag({ x: 0, y: 0 })
  }

  // Where the top card is: following the finger, flying out, or springing back.
  const grabTop = pointer.current?.grabTop ?? true
  const x = leaving === 'like' ? 640 : leaving === 'pass' ? -640 : drag.x
  const y = leaving ? drag.y + 60 : drag.y
  const rotate = (x / 16) * (grabTop ? 1 : -1)
  const progress = Math.max(-1, Math.min(1, x / SWIPE_DISTANCE))
  const lift = Math.min(1, Math.abs(progress))

  return (
    <div className="relative flex h-full flex-col gap-3 px-3 pb-24 pt-16 md:px-4 md:pb-5 md:pt-4">
      <h1 className="sr-only">Match</h1>
      {intro ? (
        <div
          aria-hidden
          onAnimationEnd={(e) => e.target === e.currentTarget && setIntro(false)}
          className="animate-match-intro-backdrop pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <span className="animate-match-intro select-none bg-[linear-gradient(90deg,#0081c8,#fcb131,#00a651,#ee334e)] bg-clip-text font-display text-6xl font-black italic tracking-tight text-transparent drop-shadow-xl md:text-8xl">
            ¡MATCHEÁ!
          </span>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando perfiles" />
          </div>
        ) : !card ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border text-center animate-in fade-in zoom-in-95 duration-300">
            <Sparkles className="size-8 text-olympic-yellow" />
            <p className="font-display text-2xl font-semibold">Viste todos los perfiles</p>
            <p className="max-w-64 text-sm text-muted-foreground">Volvé a ver los que pasaste o esperá a que se sumen nuevos.</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true)
                  await mutate(getDeck({ recycle: true }), { revalidate: false })
                  setRefreshing(false)
                }}
                className="flex items-center gap-2 rounded-full bg-olympic-blue px-4 py-2 text-sm font-bold text-olympic-white disabled:opacity-60"
              >
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Ver de nuevo
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* The cards behind move forward as the top one leaves. */}
            {data?.slice(1, 3).map((c, i) => {
              const depth = i + 1 - lift
              return (
                <Card
                  key={c.key}
                  card={c}
                  aria-hidden
                  style={{ transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`, opacity: 1 - depth * 0.25, transition: dragging ? 'none' : 'transform 300ms ease-out, opacity 300ms ease-out', zIndex: 2 - i }}
                />
              )
            }).reverse()}
            <Card
              key={card.key}
              card={card}
              expanded={expanded}
              className="cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
                transition: dragging ? 'none' : leaving ? `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease-in` : 'transform 380ms cubic-bezier(0.2, 1.4, 0.4, 1)',
                opacity: leaving ? 0 : 1,
                zIndex: 5,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              likeAmount={Math.max(0, progress)}
              passAmount={Math.max(0, -progress)}
              onOpenProfile={card.party.role === 'deportista' ? () => nav.openProfile(card.key) : undefined}
              onToggleDetails={() => setExpanded((v) => !v)}
            />
            {matched ? null : cheer}
          </>
        )}
      </div>

      {card ? (
        <div className="flex items-center justify-center gap-6">
          <RoundButton label="Paso" onClick={() => decide('pass')} className="size-16 border-2 border-olympic-red bg-background text-olympic-red" style={{ transform: `scale(${1 + Math.max(0, -progress) * 0.18})` }} active={progress < -0.6}>
            <X className="size-7" strokeWidth={2.5} />
          </RoundButton>
          <RoundButton label="Me interesa" onClick={() => decide('like')} className="size-16 bg-olympic-green text-olympic-white" style={{ transform: `scale(${1 + Math.max(0, progress) * 0.18})` }} active={progress > 0.6}>
            <Heart className="size-7 fill-current" />
          </RoundButton>
        </div>
      ) : null}

      {toast ? (
        <p role="status" className="absolute inset-x-4 bottom-28 z-30 rounded-2xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-background shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 md:bottom-8">
          {toast}
        </p>
      ) : null}

      {matched ? <MatchCelebration matched={matched} cheer={cheer} onClose={() => setMatched(null)} /> : null}
    </div>
  )
}

function RoundButton({ label, onClick, disabled, className, style, active, children }: { label: string; onClick: () => void; disabled?: boolean; className?: string; style?: React.CSSProperties; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={style}
      className={cn('flex items-center justify-center rounded-full shadow-lg transition-[transform,opacity,box-shadow] duration-150 hover:scale-105 active:scale-90 disabled:opacity-30', active && 'shadow-2xl ring-4 ring-foreground/15', className)}
    >
      {children}
    </button>
  )
}

function MatchCelebration({ matched, cheer, onClose }: { matched: { card: DeckCard; matchId?: number }; cheer: React.ReactNode; onClose: () => void }) {
  const nav = useNav()
  return (
    <div role="dialog" aria-modal="true" aria-label="Nuevo match" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 px-8 text-center backdrop-blur animate-in fade-in duration-300">
      {cheer}
      <p className="font-display text-5xl font-black italic leading-none text-olympic-yellow animate-in zoom-in-50 duration-500">¡Es un match!</p>
      <div className="flex items-center">
        {nav.account ? (
          <PartyAvatar
            party={{ name: nav.account.name, initials: nav.account.name.slice(0, 2).toUpperCase(), role: nav.role === 'invitado' ? 'deportista' : nav.role }}
            className="size-24 -rotate-6 ring-4 animate-in slide-in-from-left-16 duration-500"
          />
        ) : null}
        <span className="z-10 -mx-3 flex size-11 items-center justify-center rounded-full bg-olympic-red text-olympic-white shadow-xl animate-in zoom-in duration-700">
          <Heart className="size-5 fill-current" />
        </span>
        <PartyAvatar party={matched.card.party} className="size-24 rotate-6 ring-4 animate-in slide-in-from-right-16 duration-500" />
      </div>
      <p className="max-w-72 text-pretty text-sm leading-relaxed text-muted-foreground">Vos y {matched.card.party.name} se eligieron. Escribile y armen un acuerdo de patrocinio.</p>
      <div className="flex w-full max-w-72 flex-col gap-2">
        {matched.matchId ? (
          <button type="button" onClick={() => (onClose(), nav.openChat(matched.matchId!))} className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-6 py-3 font-bold text-olympic-white">
            <MessageCircle className="size-4" /> Escribirle ahora
          </button>
        ) : null}
        <button type="button" onClick={onClose} className="rounded-full bg-secondary px-6 py-3 font-bold">
          Seguir viendo perfiles
        </button>
      </div>
    </div>
  )
}

function Card({
  card,
  className,
  style,
  likeAmount = 0,
  passAmount = 0,
  expanded,
  onOpenProfile,
  onToggleDetails,
  ...rest
}: {
  card: DeckCard
  className?: string
  style?: React.CSSProperties
  likeAmount?: number
  passAmount?: number
  expanded?: boolean
  onOpenProfile?: () => void
  onToggleDetails?: () => void
  'aria-hidden'?: boolean
} & Pick<React.HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>) {
  // "Necesita" is about athletes; brands and events without catalog details don't show the block.
  const offers = card.company
    ? { title: 'Te ofrece', items: card.company.benefits }
    : card.athlete
      ? { title: 'Necesita', items: card.athlete.needs.length ? card.athlete.needs : ['A definir'] }
      : null
  const about = card.athlete?.goals || card.company?.about
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div {...rest} style={style} className={cn('absolute inset-0 touch-none select-none overflow-hidden rounded-3xl bg-card shadow-xl will-change-transform', className)}>
      {card.party.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.party.image} alt="" draggable={false} className={cn('absolute inset-0 size-full object-cover transition-transform duration-500', expanded && 'scale-105')} />
      ) : (
        <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-secondary font-display text-8xl font-semibold text-muted-foreground">
          {card.party.initials}
        </div>
      )}
      <div aria-hidden className={cn('absolute inset-0 bg-gradient-to-t from-background to-transparent transition-all duration-300', expanded ? 'via-background/85' : 'via-background/40')} />
      {/* Tint toward the decision while dragging. */}
      <div aria-hidden className="absolute inset-0 bg-olympic-green" style={{ opacity: likeAmount * 0.22 }} />
      <div aria-hidden className="absolute inset-0 bg-olympic-red" style={{ opacity: passAmount * 0.22 }} />

      {onToggleDetails ? (
        <button
          type="button"
          onPointerDown={stop}
          onClick={onToggleDetails}
          aria-label={expanded ? 'Ocultar información' : 'Ver información'}
          aria-pressed={expanded}
          className={cn('absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors', expanded ? 'bg-olympic-blue text-olympic-white' : 'bg-background/75 text-foreground')}
        >
          <Info className="size-5" />
        </button>
      ) : null}
      <span
        style={{ opacity: likeAmount, transform: `rotate(-14deg) scale(${0.7 + likeAmount * 0.35})` }}
        className="absolute left-5 top-8 rounded-xl border-4 border-olympic-green bg-background/30 px-3 py-1 font-display text-3xl font-black uppercase text-olympic-green backdrop-blur-sm"
      >
        Me interesa
      </span>
      <span
        style={{ opacity: passAmount, transform: `rotate(14deg) scale(${0.7 + passAmount * 0.35})` }}
        className="absolute right-16 top-8 rounded-xl border-4 border-olympic-red bg-background/30 px-3 py-1 font-display text-3xl font-black uppercase text-olympic-red backdrop-blur-sm"
      >
        Paso
      </span>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-olympic-yellow px-2.5 py-1 text-xs font-bold text-olympic-black">{card.affinity}% afinidad</span>
          {card.appliedToYou ? <span className="rounded-full bg-olympic-green px-2.5 py-1 text-xs font-bold text-olympic-white">Te eligió</span> : null}
          {card.athlete?.followers ? <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold">{card.athlete.followers} seguidores</span> : null}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="font-display text-4xl font-semibold leading-none">{card.party.name}</h2>
            <span className="text-sm text-muted-foreground">{card.party.subtitle}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            {onOpenProfile ? (
              <button type="button" onPointerDown={stop} onClick={onOpenProfile} className="rounded-full bg-background/70 px-3 py-2 text-xs font-bold">
                Ver perfil
              </button>
            ) : null}
          </div>
        </div>
        {about ? <p className={cn('text-sm leading-relaxed', !expanded && 'line-clamp-2')}>{about}</p> : null}
        {offers ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{offers.title}</span>
          <div className="flex flex-wrap gap-1.5">
            {(expanded ? offers.items : offers.items.slice(0, 3)).map((i) => (
              <span key={i} className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold">
                {i}
              </span>
            ))}
            {!expanded && offers.items.length > 3 ? <span className="rounded-full bg-background/40 px-2.5 py-1 text-xs font-semibold">+{offers.items.length - 3}</span> : null}
          </div>
        </div>
        ) : null}
        {expanded ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {card.athlete?.achievements ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Logros</span>
                <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed">{card.athlete.achievements}</p>
              </div>
            ) : null}
            {card.company?.lookingFor?.length ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Busca</span>
                <div className="flex flex-wrap gap-1.5">
                  {card.company.lookingFor.map((l) => (
                    <span key={l} className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {card.company?.howToAccess?.length ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cómo acceder</span>
                <ul className="list-inside list-disc text-sm leading-relaxed">
                  {card.company.howToAccess.slice(0, 3).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
