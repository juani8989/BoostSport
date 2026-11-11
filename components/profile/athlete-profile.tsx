'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate as globalMutate } from 'swr'
import { ArrowLeft, BadgeCheck, Bookmark, Handshake, HandHeart, Heart, Loader2, MessageCircle, Settings2, Target, Trophy, UserPlus, UserCheck } from 'lucide-react'
import { getAthleteMentions, getAthleteProfile, updateMyAthleteProfile } from '@/app/actions/athlete'
import { toggleFollow, toggleReaction } from '@/app/actions/social'
import { swipe } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet, compactNumber, timeAgo } from '@/components/app/kit'
import { AthleteProfileForm } from '@/components/auth/athlete-profile-form'
import { AddPressSheet, PressMentions } from '@/components/profile/press-mentions'
import { CreateMenu } from '@/components/profile/create-menu'
import { useCheer } from '@/components/app/cheer'
import { Composer } from '@/components/home/companeros-feed'
import type { DailyKind } from '@/lib/catalog'
import { PostViewer } from '@/components/posts/post-viewer'
import { ZoomableImage } from '@/components/posts/zoomable-image'
import type { AthleteProfile } from '@/lib/profile-types'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

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
  const [composing, setComposing] = useState<DailyKind | null>(null)
  const [cheer, fireCheer] = useCheer()

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
    mutate({ ...data, following: !data.following, stats: { ...data.stats, followers: data.stats.followers + (data.following ? -1 : 1) } }, { revalidate: false })
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

  const stats = [
    { label: 'Publicaciones', value: data.stats.posts },
    { label: 'Seguidores', value: data.stats.followers },
    { label: 'Likes', value: data.stats.likes },
    { label: 'Apoyos', value: data.stats.apoyos },
  ]

  // Photos with a credit come from the press; the rest were uploaded by the athlete.
  const ownPhotos = (p.gallery ?? []).filter((g) => !g.credit)
  const pressPhotos = (p.gallery ?? []).filter((g) => g.credit)
  const uploads = [
    ...data.posts.map((post) => ({ id: post.id, image: post.image, text: post.body, likes: post.likes as number | null, isPost: true })),
    ...ownPhotos.map((photo) => ({ id: photo.src, image: photo.src as string | null, text: photo.caption, likes: null, isPost: false })),
  ]
  const mentions = extra?.mentions ?? []
  const news = extra?.news ?? []
  const mentionCount = mentions.length + pressPhotos.length + (p.press?.length ?? 0) + news.length

  const goals = p.goals.split('\n').map((g) => g.trim()).filter(Boolean)
  const achievements = [p.achievements, p.recognitions].join('\n').split('\n').map((a) => a.trim()).filter(Boolean)

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-24">
      <section className="relative flex flex-col items-center gap-3 px-4 pb-5 pt-20 text-center">
        {cheer}
        {data.isMe ? (
          <>
            <CreateMenu onCompose={setComposing} onAddPress={() => setAddingPress(true)} />
            <button
              type="button"
              onClick={() => nav.openSettings('guardados')}
              aria-label="Guardados"
              title="Guardados"
              className="absolute right-4 top-16 z-20 flex size-10 items-center justify-center rounded-xl border-2 border-foreground"
            >
              <Bookmark className="size-5" />
            </button>
          </>
        ) : null}
        <PartyAvatar party={data.party} className="size-24 ring-4" />
        <div className="flex flex-col items-center gap-1">
          <h1 className="flex items-center gap-1.5 font-display text-3xl font-semibold">
            {data.party.name}
            {p.identityVerified ? <BadgeCheck className="size-6 text-olympic-blue" aria-label="Identidad verificada" /> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {p.discipline} · {p.country}
            {p.age ? ` · ${p.age} años` : ''}
          </p>
        </div>

        <dl className="grid w-full grid-cols-4 gap-1 rounded-2xl bg-card p-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <dd className="font-display text-2xl font-semibold">{s.value < 0 ? '—' : compactNumber(s.value)}</dd>
              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>

        {data.sponsors.length ? (
          <div className="flex w-full flex-col items-start gap-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-olympic-yellow">
              <Handshake className="size-4" />
              Sponsors
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {data.sponsors.map((s) => (
                <span key={s} className="rounded-full bg-olympic-yellow px-3 py-1 text-xs font-bold text-olympic-black">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex w-full gap-2">
          {data.isMe ? (
            <>
              <button type="button" onClick={() => setEditing(true)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-sm font-bold">
                <Settings2 className="size-4" />
                Mis datos
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={follow}
                aria-pressed={data.following}
                className={cn('flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold', data.following ? 'bg-secondary' : 'bg-olympic-blue text-olympic-white')}
              >
                {data.following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
                {data.following ? 'Siguiendo' : 'Seguir'}
              </button>
              <button
                type="button"
                onClick={support}
                aria-pressed={data.supported}
                className={cn('flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold', data.supported ? 'bg-olympic-yellow text-olympic-black' : 'bg-secondary')}
              >
                <HandHeart className="size-4" />
                {data.supported ? 'Apoyando' : 'Apoyar'}
              </button>
              {isOrg ? (
                <button
                  type="button"
                  onClick={() => (data.matchId ? nav.openChat(data.matchId) : proposeMatch())}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olympic-green py-2.5 text-sm font-bold text-olympic-white"
                >
                  {data.matchId ? <MessageCircle className="size-4" /> : <Heart className="size-4" />}
                  {data.matchId ? 'Mensaje' : 'Match'}
                </button>
              ) : null}
            </>
          )}
        </div>
        {matchNote ? <p className="text-xs text-muted-foreground">{matchNote}</p> : null}
      </section>

      {p.needs.length ? (
        <section className="mx-4 mb-4 flex flex-col gap-2 rounded-2xl border border-olympic-blue/40 bg-olympic-blue/10 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-olympic-blue">Qué necesita</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.needs.map((n) => (
              <span key={n} className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold">
                {n}
              </span>
            ))}
          </div>
          {p.needsDetail ? <p className="text-sm leading-relaxed">{p.needsDetail}</p> : null}
        </section>
      ) : null}

      <div role="tablist" aria-label="Contenido del perfil" className="sticky top-0 z-10 flex border-b border-border bg-background">
        {(['publicaciones', 'menciones', 'metas', 'logros'] as Section[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            onClick={() => setSection(s)}
            className={cn('flex-1 border-b-2 py-3 text-[11px] font-bold uppercase tracking-wide', section === s ? 'border-olympic-blue text-foreground' : 'border-transparent text-muted-foreground')}
          >
            {sectionLabel[s]}
            {s === 'menciones' && mentionCount ? <span className="ml-1 text-muted-foreground">{mentionCount}</span> : null}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {section === 'publicaciones' ? (
          uploads.length ? (
            <ul className="grid grid-cols-3 gap-1">
              {uploads.map((item) => (
                <li key={item.id} className="relative aspect-[3/4] overflow-hidden rounded-md bg-card">
                  <button
                    type="button"
                    onClick={() => (item.isPost ? setOpenPost(item.id) : setOpenPhoto({ src: item.image ?? '', caption: item.text }))}
                    aria-label={`Abrir: ${item.text.slice(0, 60)}`}
                    className="absolute inset-0 z-10"
                  />
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={item.image} alt={item.text.slice(0, 60)} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <p className="line-clamp-6 p-2 text-[11px] leading-snug">{item.text}</p>
                  )}
                  {item.likes !== null ? (
                    <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold">
                      <Heart className="size-3" />
                      {compactNumber(item.likes)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{data.isMe ? 'Publicá tu primer día desde Compañeros.' : 'Todavía no publicó nada.'}</p>
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
              <li key={g} className="flex items-start gap-3 rounded-xl bg-card p-3 text-sm leading-relaxed">
                <Target className="mt-0.5 size-4 shrink-0 text-olympic-red" />
                {g}
              </li>
            ))}
          </ul>
        ) : null}

        {section === 'logros' ? (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-2">
              {achievements.map((a) => (
                <li key={a} className="flex items-start gap-3 rounded-xl bg-card p-3 text-sm leading-relaxed">
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
      {addingPress ? <AddPressSheet onClose={() => setAddingPress(false)} onAdded={() => (mutate(), mutateExtra(), setSection('menciones'))} /> : null}
      {openPost ? <PostViewer profileKey={data.key} startId={openPost} onClose={() => (setOpenPost(null), mutate())} /> : null}
      {openPhoto ? (
        <div className="absolute inset-0 z-50 bg-background" role="dialog" aria-modal="true" aria-label="Foto">
          <ZoomableImage src={openPhoto.src} alt={openPhoto.caption} eager />
          <button type="button" onClick={() => setOpenPhoto(null)} aria-label="Cerrar" className="absolute left-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur">
            <ArrowLeft className="size-5" />
          </button>
          {openPhoto.caption ? <p className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background to-transparent p-4 pt-10 text-sm">{openPhoto.caption}</p> : null}
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
