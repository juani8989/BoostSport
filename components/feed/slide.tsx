'use client'

import { useState } from 'react'
import { ShareSheet } from '@/components/share/share-sheet'
import Image from 'next/image'
import { BadgeCheck, Bookmark, BriefcaseBusiness, HandHeart, Share2 } from 'lucide-react'
import { useAppStore } from '@/components/app-store'
import type { Athlete } from '@/lib/data'
import { cn } from '@/lib/utils'
import { FxIcon, useTap } from '@/components/app/action-fx'

export function Slide({
  image,
  alt,
  children,
  rail,
  priority,
}: {
  image?: string
  alt?: string
  children: React.ReactNode
  rail?: React.ReactNode
  priority?: boolean
}) {
  return (
    <article className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
      {image ? (
        <Image
          src={image}
          alt={alt ?? ''}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/30"
      />
      <div className="relative flex h-full items-end gap-3 px-4 pb-24 pt-28 md:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:max-w-md">{children}</div>
        {rail}
      </div>
    </article>
  )
}

/** Enough to show who a card belongs to: a sample athlete or a real one. */
export type TagAthlete = Pick<Athlete, 'name' | 'sport' | 'city' | 'category'> & { image?: string; level?: Athlete['level']; verified?: boolean }

export function AthleteTag({ athlete, onOpen }: { athlete: TagAthlete; onOpen?: () => void }) {
  const verified = athlete.verified ?? athlete.level === 'Pro'
  const content = (
    <>
      <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold ring-2 ring-foreground">
        {athlete.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={athlete.image} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span aria-hidden>{athlete.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-center gap-1 text-sm font-semibold">
          {athlete.name}
          {verified ? <BadgeCheck className="size-4 text-primary" aria-label="Perfil verificado" /> : null}
        </span>
        <span className="truncate text-xs text-foreground/80">{[athlete.sport, athlete.city, athlete.category].filter(Boolean).join(' · ')}</span>
      </div>
    </>
  )
  return onOpen ? (
    <button type="button" onClick={onOpen} aria-label={`Ver perfil de ${athlete.name}`} className="flex min-w-0 max-w-full items-center gap-2 self-start text-left">
      {content}
    </button>
  ) : (
    <div className="flex min-w-0 items-center gap-2">{content}</div>
  )
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'gold' | 'blue'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'default' && 'bg-foreground/15 text-foreground backdrop-blur',
        tone === 'gold' && 'bg-accent text-accent-foreground',
        tone === 'blue' && 'bg-primary text-primary-foreground',
      )}
    >
      {children}
    </span>
  )
}

export function RailButton({
  label,
  count,
  active,
  onClick,
  children,
}: {
  label: string
  count?: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const [tap, bump] = useTap()
  return (
    <button
      type="button"
      onClick={() => {
        if (active === undefined) bump()
        onClick()
      }}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 text-foreground md:flex-row md:gap-1 md:pr-2"
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full bg-foreground/15 backdrop-blur transition-colors md:size-10',
          active && 'bg-accent text-accent-foreground',
        )}
      >
        <FxIcon active={active} tap={tap} variant={label === 'Guardar' ? 'drop' : label === 'Compartir' ? 'fly' : 'pop'}>
          {children}
        </FxIcon>
      </span>
      <span className="text-[11px] font-semibold">{count ?? label}</span>
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function ActionRail({ postId, applause }: { postId: string; applause: number }) {
  const { toggled, toggle, pushNotification } = useAppStore()
  const clapped = toggled.has(`clap-${postId}`)
  const saved = toggled.has(`save-${postId}`)
  const recommended = toggled.has(`rec-${postId}`)
  const [sharing, setSharing] = useState(false)

  return (
    <div className="flex shrink-0 flex-col items-center gap-4 pb-2 md:absolute md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:flex-row md:gap-1 md:rounded-full md:bg-background/80 md:px-3 md:py-1.5 md:shadow-xl md:pb-1.5">
      <RailButton
        label="Aplaudir"
        count={String(applause + (clapped ? 1 : 0))}
        active={clapped}
        onClick={() => toggle(`clap-${postId}`)}
      >
        <HandHeart className="size-5" />
      </RailButton>
      <RailButton
        label="Guardar"
        count={saved ? 'Guardado' : 'Guardar'}
        active={saved}
        onClick={() => toggle(`save-${postId}`)}
      >
        <Bookmark className="size-5" />
      </RailButton>
      <RailButton
        label="Recomendar a una marca"
        count="Marca"
        active={recommended}
        onClick={() => {
          if (!recommended) {
            pushNotification({
              title: 'Recomendación enviada',
              body: 'Le pasamos este perfil a 3 marcas con alta afinidad.',
            })
          }
          toggle(`rec-${postId}`)
        }}
      >
        <BriefcaseBusiness className="size-5" />
      </RailButton>
      <RailButton label="Compartir" count="Compartir" onClick={() => setSharing(true)}>
        <Share2 className="size-5" />
      </RailButton>
      {sharing ? (
        <ShareSheet
          item={{ text: 'Mirá este logro en la Vitrina de BoostSport', url: window.location.origin, title: 'Vitrina de BoostSport', subtitle: 'Logros de deportistas que buscan sponsor' }}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </div>
  )
}

export function ProgressBar({ value, tone = 'gold' }: { value: number; tone?: 'gold' | 'blue' }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-foreground/20"
    >
      <div
        className={cn('h-full rounded-full', tone === 'gold' ? 'bg-accent' : 'bg-primary')}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
