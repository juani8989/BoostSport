'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate as globalMutate } from 'swr'
import { AtSign, BadgeCheck, Bookmark, Building2, Handshake, HandHeart, Heart, LayoutGrid, Loader2, MapPin, Medal, MessageCircle, Plus, Settings2, Share2, Target, Trash2, Trophy, TrendingUp, UserPlus, UserCheck, X } from 'lucide-react'
import { getAthleteMentions, getAthleteProfile, updateMyAthleteProfile } from '@/app/actions/athlete'
import { toggleFollow, toggleReaction } from '@/app/actions/social'
import { swipe } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet, compactNumber, timeAgo } from '@/components/app/kit'
import { AthleteProfileForm } from '@/components/auth/athlete-profile-form'
import { AddPressSheet, PressMentions } from '@/components/profile/press-mentions'
import { CreateMenu } from '@/components/profile/create-menu'
import { LogroSheet } from '@/components/profile/logro-sheet'
import { removeVitrinaItem } from '@/app/actions/vitrina'
import { useCheer } from '@/components/app/cheer'
import { Composer } from '@/components/home/companeros-feed'
import type { DailyKind } from '@/lib/catalog'
import { PostViewer } from '@/components/posts/post-viewer'
import type { AthleteProfile } from '@/lib/profile-types'
import { cn } from '@/lib/utils'
import { FxIcon } from '@/components/app/action-fx'
import { FollowSheet, type FollowTab } from '@/components/profile/follow-sheet'
import { load } from '@/lib/load'
import { ShareSheet } from '@/components/share/share-sheet'
import { galleryPhotoId } from '@/lib/photo-id'

type Section = 'publicaciones' | 'menciones' | 'metas' | 'logros'

const sectionLabel: Record<Section, string> = { publicaciones: 'Publicaciones', menciones: 'Menciones', metas: 'Metas', logros: 'Logros' }

export function AthleteProfileView({ profileKey, initialPost }: { profileKey: string; initialPost?: string }) {
  const nav = useNav()
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(['athlete', profileKey], () => load('getAthleteProfile', profileKey))
  const [section, setSection] = useState<Section>('publicaciones')
  const { data: extra, mutate: mutateExtra, isLoading: loadingExtra } = useSWR(section === 'menciones' ? ['athlete-mentions', profileKey] : null, () => load('getAthleteMentions', profileKey))
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchNote, setMatchNote] = useState<string | null>(null)
  const [openPost, setOpenPost] = useState<string | null>(initialPost ?? null)
  const [openPhoto, setOpenPhoto] = useState<{ src: string; caption: string } | null>(null)
  const [addingPress, setAddingPress] = useState(false)
  const [addingLogro, setAddingLogro] = useState(false)
  const [composing, setComposing] = useState<DailyKind | null>(null)
  const [cheer, fireCheer] = useCheer()
  const [followList, setFollowList] = useState<FollowTab | null>(null)
  const [sharingProfile, setSharingProfile] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando perfil" />
      </div>
    )
  }
  if (!data) return <p className="p-8 text-center text-sm text-muted-foreground">No encontramos este perfil.</p>

  const p = data.profile
  const isOrg = nav.role === 'empresa' || nav.role === 'evento'

  async function follow() {
    if (!nav.requireAccount() || !data) return
    mutate({ ...data, following: !data.following, stats: { ...data.stats, followers: data.stats.followers < 0 ? -1 : data.stats.followers + (data.following ? -1 : 1) } }, { revalidate: false })
    await toggleFollow(data.key)
    mutate()
  }

  async function support() {
    if (!nav.requireAccount() || !data) return
    if (!data.supported) fireCheer()
    mutate({ ...data, supported: !data.supported, stats: { ...data.stats, apoyos: data.stats.apoyos + (data.supported ? -1 : 1) } }, { revalidate: false })
    await toggleReaction(`athlete:${data.key}`, 'apoyo')
    mutate()
  }

  async function proposeMatch() {
    if (!data) return
    const res = await swipe({ targetKey: data.key, liked: true })
    if (!res.ok) return setMatchNote(res.error)
    globalMutate('deck')
    globalMutate('matches')
    if (res.matched && res.matchId) nav.openChat(res.matchId)
    else setMatchNote('Le mostramos tu interés. Si te elige, se abre el chat.')
  }

  async function save(next: AthleteProfile) {
    setPending(true)
    setError(null)
    const res = await updateMyAthleteProfile(next)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setEditing(false)
    mutate()
    router.refresh()
  }

  const stats: { label: string; value: number; list?: FollowTab }[] = [
    // The grid shows posts and the photos uploaded to the profile; the count matches it.
    { label: 'Publicaciones', value: data.stats.posts + (data.profile.gallery ?? []).filter((g) => !g.credit).length },
    { label: 'Seguidores', value: data.stats.followers, list: 'seguidores' },
    { label: 'Seguidos', value: data.stats.following, list: 'seguidos' },
    { label: 'Likes', value: data.stats.likes },
    { label: 'Apoyos', value: data.stats.apoyos },
  ]

  // Photos with a credit come from the press; the rest were uploaded by the athlete.
  const ownPhotos = (p.gallery ?? []).filter((g) => !g.credit)
  const pressPhotos = (p.gallery ?? []).filter((g) => g.credit)
  const uploads = [
    ...data.posts.map((post) => ({ id: post.id, image: post.image, text: post.body, likes: post.likes as number | null, isPost: true })),
    // Real accounts' photos open in the same viewer as the posts (likes, comments, arrows).
    ...ownPhotos.map((photo) => {
      const real = data.key.startsWith('user:')
      return { id: real ? galleryPhotoId(data.key, photo.src) : photo.src, image: photo.src as string | null, text: photo.caption, likes: null, isPost: real }
    }),
  ]
  const mentions = extra?.mentions ?? []
  const news = extra?.news ?? []
  const mentionCount = mentions.length + pressPhotos.length + (p.press?.length ?? 0) + news.length

  const goals = p.goals.split('\n').map((g) => g.trim()).filter(Boolean)
  const achievements = [p.achievements, p.recognitions].join('\n').split('\n').map((a) => a.trim()).filter(Boolean)

  const tabIcon: Record<Section, typeof LayoutGrid> = { publicaciones: LayoutGrid, menciones: AtSign, metas: Target, logros: Trophy }
  const cover = data.party.image

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-24">
      <header className="relative">
        {cheer}
        {/* Cover: the athlete's own photo, blurred, so every profile gets its own color. */}
        <div className="relative hidden h-48 overflow-hidden md:block">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-90 blur-2xl saturate-150" />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-olympic-blue/60 via-olympic-green/30 to-olympic-yellow/40" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>

        {data.isMe ? (
          <>
            <CreateMenu onCompose={setComposing} onAddPress={() => setAddingPress(true)} onAddLogro={() => setAddingLogro(true)} />
            <button
              type="button"
              onClick={() => nav.openSettings('guardados')}
              aria-label="Guardados"
              title="Guardados"
              className="absolute right-4 top-16 z-20 flex size-10 items-center justify-center rounded-full bg-background/70 md:top-4 shadow-sm backdrop-blur transition-colors hover:bg-background"
            >
              <Bookmark className="size-[18px]" />
            </button>
          </>
        ) : null}

        <MobileHeader
          data={data}
          stats={stats.filter((st) => st.label !== 'Likes')}
          bio={{ goal: goals[0], summary: p.summary }}
          onList={setFollowList}
          onSection={setSection}
          counts={{ logros: achievements.length + (p.vitrina?.length ?? 0), metas: goals.length, prensa: mentionCount }}
        />

        <div className="relative -mt-20 hidden items-end gap-6 px-10 md:mx-auto md:flex md:w-full md:max-w-[975px]">
          <PartyAvatar party={data.party} className="size-28 shrink-0 text-2xl ring-4 ring-background md:size-36 md:text-3xl" />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 md:items-start md:pb-2">
            <h1 className="flex items-center gap-1.5 text-balance font-display text-[28px] font-semibold leading-tight md:text-4xl">
              {data.party.name}
              {p.identityVerified ? <BadgeCheck className="size-6 shrink-0 text-olympic-blue" aria-label="Identidad verificada" /> : null}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground md:justify-start">
              {p.highPerformance ? (
                <span title="Verificado en fuentes olímpicas oficiales" className="flex items-center gap-1 rounded-full bg-gradient-to-r from-olympic-yellow to-[#e8a317] px-2.5 py-0.5 text-xs font-bold text-olympic-black">
                  <Medal className="size-3.5" /> Alto rendimiento
                </span>
              ) : null}
              {p.discipline ? <span className="rounded-full bg-olympic-blue/15 px-2.5 py-0.5 text-xs font-bold text-olympic-blue">{p.discipline}</span> : null}
              {p.country ? (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {p.country}
                </span>
              ) : null}
              {p.age ? <span>{p.age} años</span> : null}
              {p.club ? <span>{p.club}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-4 pt-3 md:mx-auto md:w-full md:max-w-[975px] md:px-10 md:pb-5 md:pt-5">
          <dl className="hidden grid-cols-5 divide-x divide-border rounded-2xl border border-border md:grid md:max-w-2xl">
            {stats.map((s) => {
              const inner = (
                <>
                  <dd className="text-lg font-bold tabular-nums leading-none md:text-xl">{s.value < 0 ? '—' : compactNumber(s.value)}</dd>
                  <dt className="truncate text-[10px] text-muted-foreground sm:text-xs">{s.label}</dt>
                </>
              )
              const cell = 'flex min-w-0 flex-col items-center justify-center gap-1.5 px-1 py-3'
              return s.list && s.value >= 0 ? (
                <button key={s.label} type="button" onClick={() => setFollowList(s.list!)} className={cn(cell, 'transition-colors first:rounded-l-2xl last:rounded-r-2xl hover:bg-secondary')}>
                  {inner}
                </button>
              ) : (
                <div key={s.label} className={cell}>
                  {inner}
                </div>
              )
            })}
          </dl>

          {data.sponsors.length ? (
            <div className="hidden flex-wrap items-center justify-start gap-1.5 md:flex">
              <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Handshake className="size-3.5 text-olympic-yellow" />
                Sponsors
              </span>
              {data.sponsors.map((sp) => (
                <span key={sp} className="rounded-full border border-olympic-yellow/50 bg-olympic-yellow/10 px-2.5 py-0.5 text-xs font-bold text-olympic-yellow">
                  {sp}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2 md:max-w-2xl">
            {data.isMe ? (
              <>
                <button type="button" onClick={() => setEditing(true)} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold transition-colors hover:bg-secondary/70 md:h-10">
                  <Settings2 className="size-4" />
                  Editar perfil
                </button>
                <button type="button" onClick={() => setSharingProfile(true)} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold transition-colors hover:bg-secondary/70 md:h-10">
                  <Share2 className="size-4" />
                  Compartir perfil
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={follow}
                  aria-pressed={data.following}
                  className={cn('flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors', data.following ? 'bg-secondary hover:bg-secondary/70' : 'bg-olympic-blue text-olympic-white hover:bg-olympic-blue/90')}
                >
                  <FxIcon active={data.following}>{data.following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}</FxIcon>
                  {data.following ? 'Siguiendo' : 'Seguir'}
                </button>
                <button
                  type="button"
                  onClick={support}
                  aria-pressed={data.supported}
                  className={cn('flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors', data.supported ? 'bg-olympic-yellow text-olympic-black' : 'bg-secondary hover:bg-secondary/70')}
                >
                  <FxIcon active={data.supported}>
                    <HandHeart className={cn('size-4', data.supported && 'fill-current')} />
                  </FxIcon>
                  {data.supported ? 'Apoyando' : 'Apoyar'}
                </button>
                {isOrg ? (
                  <button
                    type="button"
                    onClick={() => (data.matchId ? nav.openChat(data.matchId) : proposeMatch())}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-olympic-green text-sm font-bold text-olympic-white transition-colors hover:bg-olympic-green/90"
                  >
                    {data.matchId ? <MessageCircle className="size-4" /> : <Heart className="size-4" />}
                    {data.matchId ? 'Mensaje' : 'Match'}
                  </button>
                ) : null}
              </>
            )}
          </div>
          {matchNote ? <p className="text-center text-xs text-muted-foreground md:text-left">{matchNote}</p> : null}

          {p.needs.length ? (
            <section className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 md:max-w-2xl">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Qué necesita</h2>
              <div className="flex flex-wrap gap-1.5">
                {p.needs.map((n) => (
                  <span key={n} className="rounded-full bg-olympic-blue/15 px-2.5 py-1 text-xs font-semibold text-olympic-blue">
                    {n}
                  </span>
                ))}
              </div>
              {p.needsDetail ? <p className="text-sm leading-relaxed text-foreground/90">{p.needsDetail}</p> : null}
            </section>
          ) : null}
        </div>
      </header>

      <div role="tablist" aria-label="Contenido del perfil" className="sticky top-0 z-10 flex border-b border-border bg-background/90 backdrop-blur md:px-[max(0px,calc((100%-975px)/2))]">
        {(['publicaciones', 'menciones', 'metas', 'logros'] as Section[]).map((s) => {
          const Icon = tabIcon[s]
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={section === s}
              aria-label={sectionLabel[s]}
              onClick={() => setSection(s)}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors',
                section === s ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              <span className="hidden min-[400px]:inline">{sectionLabel[s]}</span>
              {s === 'menciones' && mentionCount ? <span className="text-muted-foreground">{mentionCount}</span> : null}
              {section === s ? <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-foreground" /> : null}
            </button>
          )
        })}
      </div>

      <div className={cn('md:mx-auto md:w-full md:max-w-[975px]', section === 'publicaciones' ? 'p-0.5' : 'px-4 py-5 md:px-10')}>
        {section === 'publicaciones' ? (
          uploads.length ? (
            <ul className="grid grid-cols-3 gap-0.5">
              {uploads.map((item) => (
                <li key={item.id} className="group relative aspect-[4/5] overflow-hidden bg-card">
                  <button
                    type="button"
                    onClick={() => (item.isPost ? setOpenPost(item.id) : setOpenPhoto({ src: item.image ?? '', caption: item.text }))}
                    aria-label={`Abrir: ${item.text.slice(0, 60)}`}
                    className="absolute inset-0 z-10"
                  />
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={item.image} alt={item.text.slice(0, 60)} className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="absolute inset-0 flex items-center bg-gradient-to-br from-olympic-blue/25 via-card to-card p-3">
                      <p className="line-clamp-6 text-xs font-medium leading-snug md:text-sm">{item.text}</p>
                    </div>
                  )}
                  {item.likes !== null ? (
                    <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-1.5 opacity-100 transition-opacity md:items-center md:justify-center md:bg-black/40 md:opacity-0 md:group-hover:opacity-100">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-white md:text-sm">
                        <Heart className="size-3.5 fill-current md:size-4" />
                        {compactNumber(item.likes)}
                      </span>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-border">
                <LayoutGrid className="size-6 text-muted-foreground" />
              </span>
              <p className="font-semibold">{data.isMe ? 'Todavía no publicaste nada' : 'Sin publicaciones'}</p>
              <p className="text-sm text-muted-foreground">{data.isMe ? 'Tocá el + para contar tu día, un logro o una meta.' : 'Cuando publique algo lo vas a ver acá.'}</p>
            </div>
          )
        ) : null}

        {section === 'menciones' ? (
            <div className="flex flex-col gap-6">
              {loadingExtra ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Buscando menciones y noticias…
                </p>
              ) : null}
              <PressMentions press={p.press ?? []} news={news} isMe={data.isMe} onChanged={() => (mutate(), mutateExtra(), router.refresh())} />
              {mentions.length ? (
                <section className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">En publicaciones</h2>
                <ul className="flex flex-col gap-3">
                  {mentions.map((m) => (
                    <li key={m.id} className="flex flex-col gap-2 rounded-xl bg-card p-3">
                      <button type="button" onClick={() => nav.openProfile(m.author.key)} className="flex items-center gap-2 self-start text-left">
                        <PartyAvatar party={m.author} className="size-8" />
                        <span className="flex flex-col leading-tight">
                          <span className="text-sm font-semibold">{m.author.name}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(m.createdAt)}</span>
                        </span>
                      </button>
                      <p className="text-sm leading-relaxed">{m.body}</p>
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={m.image} alt="" className="aspect-video w-full rounded-lg object-cover" />
                      ) : null}
                    </li>
                  ))}
                </ul>
                </section>
              ) : null}
              {pressPhotos.length ? (
                <section className="flex flex-col gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Fotos en la prensa</h2>
                  <ul className="grid grid-cols-2 gap-2">
                    {pressPhotos.map((photo, i) => (
                      <li key={photo.src} className={cn('flex flex-col gap-1', i === 0 && 'col-span-2')}>
                        <div className={cn('relative overflow-hidden rounded-xl bg-card', i === 0 ? 'aspect-video' : 'aspect-square')}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img loading="lazy" decoding="async" src={photo.src} alt={photo.caption} className="absolute inset-0 size-full object-cover" />
                        </div>
                        <p className="text-xs leading-snug">{photo.caption}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Foto:{' '}
                          {photo.sourceUrl ? (
                            <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                              {photo.credit}
                            </a>
                          ) : (
                            photo.credit
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
        ) : null}

        {section === 'metas' ? (
          <ul className="flex flex-col gap-2">
            {goals.map((g) => (
              <li key={g} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
                <Target className="mt-0.5 size-4 shrink-0 text-olympic-red" />
                {g}
              </li>
            ))}
          </ul>
        ) : null}

        {section === 'logros' ? (
          <div className="flex flex-col gap-5">
            {p.vitrina?.length || data.isMe ? (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">En la Vitrina</h2>
                  {data.isMe ? (
                    <button type="button" onClick={() => setAddingLogro(true)} className="flex items-center gap-1 text-xs font-bold text-olympic-blue">
                      <Plus className="size-3.5" /> Sumar logro
                    </button>
                  ) : null}
                </div>
                {p.vitrina?.length ? (
                  <ul className="flex flex-col gap-2">
                    {p.vitrina.map((v) => (
                      <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-sm">
                        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', v.type === 'medalla' ? (v.medal === 'Oro' ? 'bg-olympic-yellow text-olympic-black' : v.medal === 'Plata' ? 'bg-zinc-300 text-zinc-900' : 'bg-amber-700 text-white') : 'bg-olympic-blue text-olympic-white')}>
                          {v.type === 'medalla' ? <Medal className="size-4" /> : <TrendingUp className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-snug">{v.type === 'medalla' ? v.title : `${v.metric}: ${v.value}`}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {v.type === 'medalla' ? `${v.medal} · ${v.event}` : [v.previous ? `Antes: ${v.previous}` : '', v.event].filter(Boolean).join(' · ') || 'Marca personal'}
                          </span>
                        </span>
                        {data.isMe ? (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('¿Sacar este logro de la Vitrina?')) return
                              await removeVitrinaItem(v.id)
                              mutate()
                              globalMutate('vitrina')
                            }}
                            aria-label="Sacar de la Vitrina"
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Sumá tus medallas y marcas personales: es lo primero que miran los sponsors.</p>
                )}
              </section>
            ) : null}
            <ul className="flex flex-col gap-2">
              {achievements.map((a) => (
                <li key={a} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
                  <Trophy className="mt-0.5 size-4 shrink-0 text-olympic-yellow" />
                  {a}
                </li>
              ))}
            </ul>
            {p.timeline.length ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Trayectoria</h2>
                <ol className="flex flex-col gap-3 border-l-2 border-olympic-green pl-4">
                  {p.timeline.map((t) => (
                    <li key={`${t.year}-${t.text}`} className="flex flex-col text-sm">
                      <span className="font-display text-lg font-semibold text-olympic-green">{t.year}</span>
                      <span className="leading-relaxed">{t.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {p.studies ? (
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Estudios:</span> {p.studies}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {composing ? (
        <Composer
          initialKind={composing}
          onClose={() => setComposing(null)}
          onPosted={() => (mutate(), globalMutate('companeros'), globalMutate((key) => Array.isArray(key) && key[0] === 'profile-posts'))}
        />
      ) : null}
      {addingLogro ? <LogroSheet onClose={() => setAddingLogro(false)} onAdded={() => (mutate(), globalMutate('vitrina'), setSection('logros'))} /> : null}
      {sharingProfile ? (
        <ShareSheet
          item={{ text: `Mirá el perfil de ${data.party.name} en BoostSport`, url: `${window.location.origin}/?perfil=${encodeURIComponent(data.key)}`, title: data.party.name, subtitle: [p.discipline, p.country].filter(Boolean).join(' · '), image: data.party.image }}
          onClose={() => setSharingProfile(false)}
        />
      ) : null}
      {followList ? (
        <FollowSheet profileKey={data.key} name={data.party.name} initialTab={followList} onClose={() => setFollowList(null)} onChange={() => mutate()} />
      ) : null}
      {addingPress ? <AddPressSheet onClose={() => setAddingPress(false)} onAdded={() => (mutate(), mutateExtra(), setSection('menciones'))} /> : null}
      {openPost ? <PostViewer profileKey={data.key} startId={openPost} onClose={() => (setOpenPost(null), mutate())} /> : null}
      {openPhoto ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-10" role="dialog" aria-modal="true" aria-label="Foto">
          <button type="button" aria-label="Cerrar" onClick={() => setOpenPhoto(null)} className="absolute inset-0 bg-black/90 animate-in fade-in duration-150 motion-reduce:animate-none" />
          <button type="button" onClick={() => setOpenPhoto(null)} aria-label="Cerrar" className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20">
            <X className="size-5" />
          </button>
          <figure className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl animate-in zoom-in-95 duration-150 motion-reduce:animate-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={openPhoto.src} alt={openPhoto.caption} className="max-h-[72vh] w-full bg-black object-contain" />
            {openPhoto.caption ? <figcaption className="px-4 py-3 text-sm leading-relaxed">{openPhoto.caption}</figcaption> : null}
          </figure>
        </div>
      ) : null}

      {editing && nav.account?.profile.kind === 'deportista' ? (
        <Sheet
          title="Mis datos"
          onClose={() => setEditing(false)}
          action={
            <button type="submit" form="athlete-profile-form" disabled={pending} className="rounded-full bg-olympic-blue px-4 py-2 text-sm font-bold text-olympic-white disabled:opacity-60">
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          }
        >
          {error ? <p role="alert" className="mb-4 rounded-xl bg-destructive/15 px-4 py-3 text-sm text-destructive">{error}</p> : null}
          <AthleteProfileForm formId="athlete-profile-form" hideSubmit initial={nav.account.profile} pending={pending} error={error} onSubmit={save} />
        </Sheet>
      ) : null}
    </div>
  )
}

type HeaderData = NonNullable<Awaited<ReturnType<typeof getAthleteProfile>>>

/**
 * Phones: the top of the profile as an athlete's card, BoostSport's own way. The photo framed by
 * the five Olympic colors, a scoreboard where the apoyos lead (what moves sponsors), and the goal
 * they're chasing as a banner. Logros, metas and prensa live in the tabs below.
 */
function MobileHeader({
  data,
  stats,
  bio,
  onList,
}: {
  data: HeaderData
  stats: { label: string; value: number; list?: FollowTab }[]
  bio: { goal?: string; summary?: string }
  onList: (tab: FollowTab) => void
  onSection?: (s: Section) => void
  counts?: { logros: number; metas: number; prensa: number }
}) {
  const p = data.profile
  const [more, setMore] = useState(false)
  const apoyos = stats.find((st) => st.label === 'Apoyos')
  const rest = stats.filter((st) => st.label !== 'Apoyos')
  const num = (v: number) => (v < 0 ? '—' : compactNumber(v))

  return (
    <div className="flex flex-col gap-4 px-4 pt-[4.75rem] md:hidden">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* The five Olympic colors around the photo. */}
        <span className="rounded-full bg-[conic-gradient(var(--color-olympic-blue),var(--color-olympic-yellow),var(--foreground),var(--color-olympic-green),var(--color-olympic-red),var(--color-olympic-blue))] p-[3px]">
          <span className="block rounded-full bg-background p-[3px]">
            <PartyAvatar party={data.party} className="size-24 text-2xl ring-0" />
          </span>
        </span>
        <h1 className="flex items-center gap-1.5 text-balance font-display text-[26px] font-semibold leading-tight">
          {data.party.name}
          {p.identityVerified ? <BadgeCheck className="size-5 shrink-0 text-olympic-blue" aria-label="Identidad verificada" /> : null}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
          {p.highPerformance ? (
            <span title="Verificado en fuentes olímpicas oficiales" className="flex items-center gap-1 rounded-full bg-gradient-to-r from-olympic-yellow to-[#e8a317] px-2.5 py-1 text-xs font-bold text-olympic-black">
              <Medal className="size-3.5" /> Alto rendimiento
            </span>
          ) : null}
          {p.discipline ? <span className="rounded-full bg-olympic-blue px-2.5 py-1 font-bold text-olympic-white">{p.discipline}</span> : null}
          {p.country ? (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold">
              <MapPin className="size-3 text-olympic-red" /> {p.country}
            </span>
          ) : null}
          {p.club ? (
            <span className="flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold">
              <Building2 className="size-3 shrink-0 text-olympic-blue" /> <span className="truncate">{p.club}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Scoreboard: the apoyos big on the left, the rest beside them. */}
      <div className="grid grid-cols-[auto_1fr] overflow-hidden rounded-2xl border border-border">
        {apoyos ? (
          <div className="flex flex-col items-center justify-center gap-0.5 bg-olympic-yellow/15 px-5 py-3">
            <HandHeart className="size-5 text-olympic-yellow" />
            <span className="font-display text-2xl font-semibold tabular-nums leading-none">{num(apoyos.value)}</span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-olympic-yellow">Apoyos</span>
          </div>
        ) : null}
        <dl className="grid grid-cols-3 divide-x divide-border">
          {rest.map((st) => {
            const inner = (
              <>
                <dd className="w-full text-lg font-bold tabular-nums leading-tight">{num(st.value)}</dd>
                <dt className="w-full truncate text-[11px] text-muted-foreground">{st.label}</dt>
              </>
            )
            const cell = 'flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-3 text-center'
            return st.list && st.value >= 0 ? (
              <button key={st.label} type="button" onClick={() => onList(st.list!)} className={cn(cell, 'transition-colors active:bg-secondary')}>
                {inner}
              </button>
            ) : (
              <div key={st.label} className={cell}>
                {inner}
              </div>
            )
          })}
        </dl>
      </div>

      {/* The goal as a banner: "Va por …". */}
      {bio.goal ? (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-olympic-green/20 to-transparent px-4 py-3">
          <Target className="size-5 shrink-0 text-olympic-green" />
          <p className="min-w-0 text-sm leading-snug">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-olympic-green">Va por</span>
            <span className="line-clamp-2">{bio.goal}</span>
          </p>
        </div>
      ) : null}

      {bio.summary ? (
        <div className="flex flex-col gap-1 text-sm leading-relaxed text-foreground/85">
          <p className={cn(!more && 'line-clamp-3')}>{bio.summary}</p>
          {bio.summary.length > 120 ? (
            <button type="button" onClick={() => setMore((m) => !m)} className="self-start text-xs font-semibold text-muted-foreground">
              {more ? 'Ver menos' : 'Leer más'}
            </button>
          ) : null}
        </div>
      ) : null}

      {data.sponsors.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Lo bancan</span>
          {data.sponsors.map((sp) => (
            <span key={sp} className="flex items-center gap-1 rounded-full bg-olympic-yellow px-2.5 py-1 text-xs font-bold text-olympic-black">
              <Handshake className="size-3.5" /> {sp}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
