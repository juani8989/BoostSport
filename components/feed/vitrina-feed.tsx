'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import useSWR, { mutate as globalMutate } from 'swr'
import { Lock, Medal, Plus, ShieldCheck, TrendingUp, Unlock, UserCheck } from 'lucide-react'
import { useAppStore } from '@/components/app-store'
import { useNav } from '@/components/app/nav'
import type { VitrinaCard } from '@/app/actions/vitrina'
import { LogroSheet } from '@/components/profile/logro-sheet'
import { load } from '@/lib/load'
import { FeedSkeleton } from '@/components/app/kit'
import { ActionRail, AthleteTag, Chip, ProgressBar, Slide } from './slide'
import { Button } from '@/components/ui/button'

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100
      const y = ((p - min) / (max - min)) * 80 + 10
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full" aria-hidden>
      <polyline points={coords} fill="none" stroke="var(--accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={(i / (points.length - 1)) * 100}
          cy={((p - min) / (max - min)) * 80 + 10}
          r="2"
          fill="var(--foreground)"
        />
      ))}
    </svg>
  )
}

function VitrinaSlide({ post, index }: { post: VitrinaCard; index: number }) {
  const { mode, unlockedSecrets } = useAppStore()
  const { goTo, openProfile } = useNav()
  const setTab = goTo
  const athlete = post.athlete
  const tag = <AthleteTag athlete={athlete} onOpen={() => openProfile(athlete.key)} />

  if (post.type === 'achievement') {
    return (
      <Slide image={post.image} alt={`${athlete.name} celebrando`} priority={index === 0} rail={<ActionRail postId={post.id} applause={post.real ? 0 : 5120} />}>
        <div className="flex flex-wrap gap-2">
          <Chip tone="gold">
            <Medal className="size-3.5" /> Medalla de {post.medal.toLowerCase()}
          </Chip>
          {post.verifiedBy ? (
            <Chip tone="blue">
              <ShieldCheck className="size-3.5" /> Verificado por {post.verifiedBy}
            </Chip>
          ) : (
            <Chip>
              <UserCheck className="size-3.5" /> Cargado por {athlete.name.split(' ')[0]}
            </Chip>
          )}
        </div>
        {tag}
        <h2 className="font-display text-4xl font-semibold leading-none text-balance">{post.title}</h2>
        <p className="text-sm text-muted-foreground">{post.event}</p>
        <div className="flex flex-col gap-1.5 rounded-xl bg-background/70 p-3 backdrop-blur">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Listo para sponsor</span>
            <span className="font-semibold">{athlete.sponsorReady} %</span>
          </div>
          <ProgressBar value={athlete.sponsorReady} />
          {athlete.sponsoredBy ? (
            <span className="text-xs text-muted-foreground">Ya patrocinado por {athlete.sponsoredBy}</span>
          ) : null}
        </div>
      </Slide>
    )
  }

  if (post.type === 'stats') {
    return (
      <Slide image={post.image} alt="" rail={<ActionRail postId={post.id} applause={post.real ? 0 : 980} />}>
        <Chip>{post.real ? 'Nueva marca personal' : 'Tarjeta de estadísticas'}</Chip>
        {tag}
        <div className="flex flex-col gap-2 rounded-2xl bg-background/80 p-4 backdrop-blur">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{post.metric} · marca personal</span>
          <span className="font-display text-5xl font-semibold leading-none">{post.current}</span>
          {post.points.length > 1 ? <Sparkline points={post.points} /> : null}
          <span className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <TrendingUp className="size-4" /> {post.summary}
          </span>
        </div>
      </Slide>
    )
  }

  if (post.type !== 'secret') return null
  const unlocked = unlockedSecrets.has(athlete.key.replace(/^seed:at-/, ''))
  return (
    <article className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
      <Image
        src={post.image}
        alt=""
        fill
        sizes="420px"
        className={unlocked ? 'object-cover' : 'scale-110 object-cover blur-xl'}
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/40" />
      <div className="relative flex h-full items-end gap-3 px-4 pb-24 pt-28">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Chip tone="gold">
            {unlocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />} Top Secret
          </Chip>
          {tag}
          <h2 className="font-display text-3xl font-semibold leading-none text-balance">{post.title}</h2>
          {unlocked ? (
            <ul className="flex flex-col gap-2 rounded-xl bg-background/80 p-3 text-sm leading-relaxed backdrop-blur">
              {post.content.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-background/70 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Lock className="size-5" />
                </span>
                <p className="text-pretty text-sm leading-relaxed">{post.teaser}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Solo lo pueden abrir las empresas verificadas o las que hicieron match.
              </p>
              {mode === 'empresa' ? (
                <Button onClick={() => setTab('match')} className="h-11 w-full font-semibold">
                  Enviar propuesta para desbloquear
                </Button>
              ) : null}
            </div>
          )}
        </div>
        <ActionRail postId={post.id} applause={1430} />
      </div>
    </article>
  )
}

export function VitrinaFeed() {
  const { role } = useNav()
  const { data, mutate } = useSWR('vitrina', () => load('getVitrinaFeed'))
  const [adding, setAdding] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)
  // After publishing, go back to the top: the new logro is the first card.
  const showNewest = async () => {
    await mutate()
    globalMutate(['athlete', 'me'])
    addButton.current?.closest('.snap-y')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!data) {
    return <FeedSkeleton label="Cargando la Vitrina" />
  }

  return (
    <>
      {data.map((post, i) => (
        <VitrinaSlide key={post.id} post={post} index={i} />
      ))}
      {role === 'deportista' ? (
        <>
          <button
            ref={addButton}
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Sumar un logro a la Vitrina"
            className="absolute right-4 top-28 z-20 flex size-11 items-center justify-center rounded-full bg-olympic-red text-olympic-white shadow-lg"
          >
            <Plus className="size-5" />
          </button>
          {adding ? <LogroSheet onClose={() => setAdding(false)} onAdded={showNewest} /> : null}
        </>
      ) : null}
    </>
  )
}
