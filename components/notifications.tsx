'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, BadgeCheck, BadgeDollarSign, Bell, Gift, HandHeart, Handshake, Heart, Loader2, MessageCircle, Repeat2, Sparkles, UserPlus, X, XCircle } from 'lucide-react'
import { useAppStore } from '@/components/app-store'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, timeAgo } from '@/components/app/kit'
import { markNotificationsRead, type AppNotification, type NotificationType } from '@/app/actions/notifications'
import { toggleFollow } from '@/app/actions/social'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

export function NotificationBanner() {
  const { banner, dismissBanner } = useAppStore()

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(dismissBanner, 4500)
    return () => clearTimeout(t)
  }, [banner, dismissBanner])

  if (!banner) return null

  return (
    <div
      role="status"
      aria-live="polite"
      key={banner.id}
      className="absolute inset-x-3 top-3 z-50 flex items-start gap-3 rounded-2xl bg-foreground p-3 text-background shadow-2xl animate-in slide-in-from-top duration-300"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Bell className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold">{banner.title}</span>
        <span className="line-clamp-2 text-xs leading-relaxed">{banner.body}</span>
      </div>
      <button type="button" onClick={dismissBanner} aria-label="Cerrar notificación" className="p-1">
        <X className="size-4" />
      </button>
    </div>
  )
}

type Filter = 'todas' | 'interacciones' | 'seguidores' | 'chats'

const FILTERS: { id: Filter; label: string; types: NotificationType[] }[] = [
  { id: 'todas', label: 'Todas', types: [] },
  { id: 'interacciones', label: 'Interacciones', types: ['like', 'apoyo', 'repost', 'donar', 'comentario', 'apoyo-perfil'] },
  { id: 'seguidores', label: 'Seguidores', types: ['seguidor', 'interes'] },
  { id: 'chats', label: 'Matches y propuestas', types: ['match', 'mensaje', 'propuesta', 'propuesta-aceptada', 'propuesta-rechazada'] },
]

const ICON: Record<NotificationType, { icon: typeof Heart; className: string }> = {
  like: { icon: Heart, className: 'bg-olympic-red text-olympic-white' },
  apoyo: { icon: HandHeart, className: 'bg-olympic-yellow text-olympic-black' },
  'apoyo-perfil': { icon: HandHeart, className: 'bg-olympic-yellow text-olympic-black' },
  repost: { icon: Repeat2, className: 'bg-olympic-green text-olympic-white' },
  donar: { icon: Gift, className: 'bg-olympic-green text-olympic-white' },
  comentario: { icon: MessageCircle, className: 'bg-olympic-blue text-olympic-white' },
  seguidor: { icon: UserPlus, className: 'bg-olympic-blue text-olympic-white' },
  interes: { icon: Sparkles, className: 'bg-olympic-yellow text-olympic-black' },
  match: { icon: Handshake, className: 'bg-olympic-green text-olympic-white' },
  mensaje: { icon: MessageCircle, className: 'bg-olympic-blue text-olympic-white' },
  propuesta: { icon: BadgeDollarSign, className: 'bg-olympic-yellow text-olympic-black' },
  'propuesta-aceptada': { icon: BadgeCheck, className: 'bg-olympic-green text-olympic-white' },
  'propuesta-rechazada': { icon: XCircle, className: 'bg-olympic-red text-olympic-white' },
}

function groupOf(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000
  if (days < 1) return 'Hoy'
  if (days < 7) return 'Esta semana'
  if (days < 31) return 'Este mes'
  return 'Antes'
}

/** Real notifications, refreshed every 30 seconds. */
export function useNotifications(enabled: boolean) {
  const { data, mutate } = useSWR(enabled ? 'notifications' : null, () => load('getMyNotifications'), { refreshInterval: 30_000 })
  const markRead = useCallback(async () => {
    if (!data?.unread) return
    mutate({ ...data, unread: 0 }, { revalidate: false })
    await markNotificationsRead()
  }, [data, mutate])
  return { items: data?.items ?? [], unread: data?.unread ?? 0, paused: data?.paused ?? false, loaded: !!data, markRead, refresh: () => mutate() }
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const nav = useNav()
  const { items, loaded, paused, refresh } = useNotifications(true)
  const [filter, setFilter] = useState<Filter>('todas')
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const types = FILTERS.find((f) => f.id === filter)!.types
  const visible = items.filter((n) => !types.length || types.includes(n.type))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function open(n: AppNotification) {
    onClose()
    if (n.target.kind === 'chat') nav.openChat(n.target.matchId)
    else if (n.target.kind === 'post') nav.openProfile(n.target.ownerKey, n.target.postId)
    // Only athletes have a public profile; interest from a brand or event is answered in Match.
    else if (n.actor.role === 'deportista') nav.openProfile(n.target.key)
    else if (n.type === 'interes') nav.goTo('match')
    else nav.goTo('mensajes')
  }

  async function followBack(n: AppNotification) {
    setFollowed((prev) => new Set(prev).add(n.actor.key))
    await toggleFollow(n.actor.key)
    refresh()
  }

  const groups: { title: string; list: AppNotification[] }[] = []
  for (const n of visible) {
    const title = groupOf(n.at)
    const last = groups.at(-1)
    if (last?.title === title) last.list.push(n)
    else groups.push({ title, list: [n] })
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background animate-in slide-in-from-right-8 fade-in duration-200 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="notif-title">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 pb-3 pt-5">
        <button type="button" onClick={onClose} aria-label="Volver" className="flex size-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h2 id="notif-title" className="font-display text-lg font-semibold">
          Notificaciones
        </h2>
      </header>
      <div role="tablist" className="flex shrink-0 gap-2 overflow-x-auto border-b border-border px-4 py-3 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', filter === f.id ? 'bg-foreground text-background' : 'bg-secondary')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {paused ? <p className="mx-4 mt-3 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">Tenés las notificaciones en pausa: no te avisamos, pero acá las ves igual.</p> : null}
        {!loaded ? <Loader2 className="mx-auto my-12 size-6 animate-spin text-muted-foreground" aria-label="Cargando notificaciones" /> : null}
        {loaded && !visible.length ? (
          <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
            <Bell className="size-10 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-semibold">Todavía no hay notificaciones</p>
            <p className="text-sm text-muted-foreground">Cuando alguien te siga, reaccione a tus publicaciones, te escriba o te mande una propuesta, lo vas a ver acá.</p>
          </div>
        ) : null}
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="px-4 pb-1 pt-4 text-sm font-bold">{g.title}</h3>
            <ul>
              {g.list.map((n) => {
                const meta = ICON[n.type]
                const isFollowed = n.followsBack || followed.has(n.actor.key)
                return (
                  <li key={n.id} className={cn('flex items-center gap-3 px-4 py-2.5', n.unread && 'bg-olympic-blue/5')}>
                    <button type="button" onClick={() => open(n)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="relative shrink-0">
                        <PartyAvatar party={n.actor} className="size-11" />
                        <span className={cn('absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full ring-2 ring-background', meta.className)}>
                          <meta.icon className="size-3" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-snug">
                        <span className="font-semibold">{n.actor.name}</span>
                        {n.others ? <span className="font-semibold"> y {n.others} más</span> : null} {n.text}{' '}
                        <span className="whitespace-nowrap text-muted-foreground">{timeAgo(n.at)}</span>
                        {n.preview ? <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{n.preview}</span> : null}
                      </span>
                    </button>
                    {n.type === 'seguidor' && !isFollowed ? (
                      <button type="button" onClick={() => followBack(n)} className="shrink-0 rounded-lg bg-olympic-blue px-3 py-1.5 text-xs font-bold text-olympic-white">
                        Seguir
                      </button>
                    ) : n.type === 'seguidor' ? (
                      <span className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold">Siguiendo</span>
                    ) : n.target.kind === 'chat' ? (
                      <button type="button" onClick={() => open(n)} className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold">
                        {n.type === 'propuesta' ? 'Responder' : 'Ver chat'}
                      </button>
                    ) : n.image ? (
                      <button type="button" onClick={() => open(n)} aria-label="Ver publicación" className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.image} alt="" loading="lazy" className="size-11 rounded-md object-cover" />
                      </button>
                    ) : null}
                    {n.unread ? <span aria-label="Sin leer" className="size-2 shrink-0 rounded-full bg-olympic-blue" /> : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
