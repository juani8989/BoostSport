'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Flag,
  Gift,
  HandHeart,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Repeat2,
  Share2,
  Trash2,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { getProfilePosts, getReactors, pledgeDonation, recordView, type ViewerPost } from '@/app/actions/posts'
import { deletePost, reportPost, toggleFollow, toggleReaction } from '@/app/actions/social'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet, compactNumber, timeAgo } from '@/components/app/kit'
import { CommentsSheet } from '@/components/home/companeros-feed'
import { useSettings } from '@/components/settings/use-settings'
import { ZoomableImage } from '@/components/posts/zoomable-image'
import { SaveFolderSheet, SavedToast } from '@/components/saved/save-folders'
import { ShareSheet } from '@/components/share/share-sheet'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

const kindMeta: Record<ViewerPost['kind'], { label: string; className: string }> = {
  diario: { label: 'Mi día', className: 'bg-olympic-blue text-olympic-white' },
  idea: { label: 'Idea', className: 'bg-olympic-yellow text-olympic-black' },
  colab: { label: 'Colab', className: 'bg-olympic-green text-olympic-white' },
  meta: { label: 'Meta', className: 'bg-olympic-red text-olympic-white' },
}

const CAPTION_WORDS = 20

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Counter = 'likes' | 'apoyos' | 'reposts'
type ToggleFlag = 'liked' | 'supported' | 'reposted' | 'saved'

/** Full-screen vertical feed of one profile's posts, opened from the profile grid. */
export function PostViewer({ profileKey, startId, onClose }: { profileKey: string; startId?: string; onClose: () => void }) {
  const nav = useNav()
  const { data, mutate, isLoading } = useSWR(['profile-posts', profileKey], () => load('getProfilePosts', profileKey))
  const { settings } = useSettings(nav.role !== 'invitado')
  const scroller = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(!settings.feed.autoplay)
  const [sheet, setSheet] = useState<{ type: 'comments' | 'people' | 'donate' | 'menu'; post: ViewerPost } | null>(null)
  const positioned = useRef(false)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [folderFor, setFolderFor] = useState<string | null>(null)
  const [sharing, setSharing] = useState<string | null>(null)
  const sharedPost = data?.find((p) => p.id === sharing)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sheet && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sheet])

  // Open on the post that was tapped.
  useEffect(() => {
    if (!data || positioned.current || !startId) return
    positioned.current = true
    document.getElementById(`viewer-${startId}`)?.scrollIntoView({ block: 'start' })
  }, [data, startId])

  function patch(id: string, change: Partial<ViewerPost>) {
    mutate((prev) => prev?.map((p) => (p.id === id ? { ...p, ...change } : p)), { revalidate: false })
  }

  async function toggle(post: ViewerPost, kind: 'like' | 'apoyo' | 'repost' | 'guardado', flag: ToggleFlag, counter?: Counter) {
    if (!nav.requireAccount()) return
    const on = !post[flag]
    patch(post.id, { [flag]: on, ...(counter ? { [counter]: post[counter] + (on ? 1 : -1) } : {}) } as Partial<ViewerPost>)
    if (kind === 'guardado') setSavedToast(on ? post.id : null)
    await toggleReaction(post.id, kind)
    globalMutate('companeros')
    if (kind === 'guardado') globalMutate('saved')
  }

  async function follow(post: ViewerPost) {
    if (!nav.requireAccount()) return
    mutate((prev) => prev?.map((p) => ({ ...p, following: !post.following })), { revalidate: false })
    await toggleFollow(post.author.key)
    globalMutate(['athlete', profileKey])
  }

  function share(post: ViewerPost) {
    setSharing(post.id)
  }

  const hideCounts = settings.feed.hideLikeCounts

  return (
    <div className="absolute inset-0 z-50 bg-background animate-in fade-in duration-200 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-label="Publicaciones">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-background/90 to-transparent px-3 pb-6 pt-4">
        <button type="button" onClick={onClose} aria-label="Volver al perfil" className="flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-muted-foreground">Publicaciones</span>
          <span className="text-sm font-semibold">{data?.[0]?.author.name ?? ''}</span>
        </div>
        {data?.some((p) => p.audio) ? (
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activar sonido' : 'Silenciar'} className="ml-auto flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur">
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando publicaciones" />
        </div>
      ) : null}
      {data && !data.length ? <p className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">No hay publicaciones para mostrar.</p> : null}

      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar">
        {data?.map((post, index) => (
          <Slide
            key={post.id}
            post={post}
            eager={index < 2 || post.id === startId}
            muted={muted}
            hideCounts={hideCounts && !post.mine}
            root={scroller}
            onToggle={toggle}
            onFollow={() => follow(post)}
            onShare={() => share(post)}
            onOpen={(type) => (type === 'comments' || type === 'people' || nav.requireAccount() ? setSheet({ type, post }) : null)}
            onOpenProfile={() => (onClose(), nav.openProfile(post.author.key))}
          />
        ))}
      </div>

      {sheet?.type === 'comments' ? <CommentsSheet post={sheet.post} onClose={() => setSheet(null)} onAdded={() => mutate()} /> : null}
      {sheet?.type === 'people' ? <PeopleSheet post={sheet.post} onClose={() => setSheet(null)} /> : null}
      {sheet?.type === 'donate' ? <DonateSheet post={sheet.post} onClose={() => setSheet(null)} onDone={() => patch(sheet.post.id, { donated: true, donations: sheet.post.donations + (sheet.post.donated ? 0 : 1) })} /> : null}
      {savedToast ? <SavedToast onChoose={() => (setFolderFor(savedToast), setSavedToast(null))} onDone={() => setSavedToast(null)} /> : null}
      {folderFor ? <SaveFolderSheet targetId={folderFor} onClose={() => setFolderFor(null)} /> : null}
      {sharedPost ? (
        <ShareSheet
          item={{
            text: `${sharedPost.author.name} en BoostSport: ${sharedPost.body.slice(0, 120)}`,
            url: `${window.location.origin}/?perfil=${encodeURIComponent(sharedPost.author.key)}&post=${encodeURIComponent(sharedPost.id)}`,
            title: sharedPost.author.name,
            subtitle: sharedPost.body,
            image: sharedPost.image,
            repost: { active: sharedPost.reposted, onToggle: () => toggle(sharedPost, 'repost', 'reposted', 'reposts') },
          }}
          onClose={() => setSharing(null)}
        />
      ) : null}
      {sheet?.type === 'menu' ? <MenuSheet post={sheet.post} onClose={() => setSheet(null)} onRemoved={() => (mutate(), globalMutate(['athlete', profileKey]))} /> : null}
    </div>
  )
}

function Slide({
  post,
  eager,
  muted,
  hideCounts,
  root,
  onToggle,
  onFollow,
  onShare,
  onOpen,
  onOpenProfile,
}: {
  post: ViewerPost
  eager: boolean
  muted: boolean
  hideCounts: boolean
  root: React.RefObject<HTMLDivElement | null>
  onToggle: (post: ViewerPost, kind: 'like' | 'apoyo' | 'repost' | 'guardado', flag: ToggleFlag, counter?: Counter) => void
  onFollow: () => void
  onShare: () => void
  onOpen: (type: 'comments' | 'people' | 'donate' | 'menu') => void
  onOpenProfile: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [active, setActive] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const viewed = useRef(false)

  // A post counts as viewed after being on screen for a second.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = entry.isIntersecting && entry.intersectionRatio >= 0.6
        setActive(on)
        clearTimeout(timer)
        if (on && !viewed.current) {
          timer = setTimeout(() => {
            viewed.current = true
            recordView(post.id)
          }, 1000)
        }
      },
      { root: root.current, threshold: [0, 0.6, 1] },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [post.id, root])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = muted
    if (active) audio.play().catch(() => {})
    else {
      audio.pause()
      audio.currentTime = 0
    }
  }, [active, muted])

  const words = post.body.trim().split(/\s+/)
  const long = words.length > CAPTION_WORDS
  const caption = long && !expanded ? `${words.slice(0, CAPTION_WORDS).join(' ')}…` : post.body
  const kind = kindMeta[post.kind]

  return (
    <article ref={ref} id={`viewer-${post.id}`} className="flex h-full w-full shrink-0 snap-start snap-always flex-col gap-3 px-4 pb-6 pt-16">
      {post.audio ? <audio ref={audioRef} src={post.audio.url} loop preload="none" /> : null}

      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpenProfile} className="flex min-w-0 items-center gap-2 text-left">
          <PartyAvatar party={post.author} className="size-9" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{post.author.name}</span>
            {post.audio ? (
              <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <Music2 className={cn('size-3 shrink-0', active && !muted && 'animate-pulse')} />
                {post.audio.name || 'Audio original'}
              </span>
            ) : (
              <span className="truncate text-[11px] text-muted-foreground">{post.author.subtitle}</span>
            )}
          </span>
        </button>
        {!post.mine ? (
          <button
            type="button"
            onClick={onFollow}
            aria-pressed={post.following}
            className={cn('flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', post.following ? 'bg-secondary' : 'bg-olympic-blue text-olympic-white')}
          >
            {post.following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
            {post.following ? 'Siguiendo' : 'Seguir'}
          </button>
        ) : null}
        <button type="button" onClick={() => onOpen('menu')} aria-label="Más opciones" className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary">
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {/* The photo is shown whole inside its frame; zoom only when the person asks for it. */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
        {post.image ? (
          <ZoomableImage src={post.image} alt={post.body.slice(0, 80)} eager={eager} />
        ) : (
          <div className={cn('flex size-full items-center justify-center p-6', kind.className)}>
            <p className="line-clamp-[10] text-center font-display text-2xl font-semibold leading-snug">{post.body}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Action label="Me gusta" count={hideCounts ? undefined : post.likes} active={post.liked} activeClass="text-olympic-red" onClick={() => onToggle(post, 'like', 'liked', 'likes')} onCount={() => onOpen('people')}>
          <Heart className={cn('size-6', post.liked && 'fill-current')} />
        </Action>
        <Action label="Apoyar" count={hideCounts ? undefined : post.apoyos} active={post.supported} activeClass="text-olympic-yellow" onClick={() => onToggle(post, 'apoyo', 'supported', 'apoyos')} onCount={() => onOpen('people')}>
          <HandHeart className={cn('size-6', post.supported && 'fill-current')} />
        </Action>
        <Action label="Comentarios" count={post.comments} onClick={() => onOpen('comments')} onCount={() => onOpen('comments')}>
          <MessageCircle className="size-6" />
        </Action>
        <Action label={post.reposted ? 'Quitar recompartido' : 'Recompartir'} count={post.reposts} active={post.reposted} activeClass="text-olympic-green" onClick={() => onToggle(post, 'repost', 'reposted', 'reposts')} onCount={() => onOpen('people')}>
          <Repeat2 className="size-6" />
        </Action>
        <Action label="Compartir" onClick={onShare}>
          <Share2 className="size-6" />
        </Action>
        <span className="flex-1" />
        {!post.mine ? (
          <Action label="Donar" active={post.donated} activeClass="text-olympic-green" onClick={() => onOpen('donate')}>
            <Gift className="size-6" />
          </Action>
        ) : null}
        <Action label={post.saved ? 'Quitar de guardados' : 'Guardar'} active={post.saved} activeClass="text-olympic-yellow" onClick={() => onToggle(post, 'guardado', 'saved')}>
          <Bookmark className={cn('size-6', post.saved && 'fill-current')} />
        </Action>
      </div>

      <div className={cn('flex shrink-0 flex-col gap-2', expanded && 'max-h-[40%] overflow-y-auto')}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', kind.className)}>{kind.label}</span>
          {post.mine ? (
            <button type="button" onClick={() => onOpen('people')} className="flex items-center gap-1 underline-offset-2 hover:underline">
              <Eye className="size-3.5" />
              {compactNumber(post.views)} vistas
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              {compactNumber(post.views)} vistas
            </span>
          )}
          {post.donations ? (
            <span className="flex items-center gap-1">
              <Gift className="size-3.5" />
              {post.donations} {post.donations === 1 ? 'quiere donar' : 'quieren donar'}
            </span>
          ) : null}
        </div>

        {post.image ? (
          <p className="text-pretty text-sm leading-relaxed">
            <button type="button" onClick={onOpenProfile} className="mr-1 font-semibold">
              {post.author.name}
            </button>
            {caption}{' '}
            {long ? (
              <button type="button" onClick={() => setExpanded((e) => !e)} className="font-semibold text-muted-foreground underline-offset-2 hover:underline">
                {expanded ? 'ver menos' : 'seguir leyendo'}
              </button>
            ) : null}
          </p>
        ) : null}

        <time dateTime={post.createdAt} className="text-[11px] text-muted-foreground">
          {fullDate(post.createdAt)} · {timeAgo(post.createdAt)}
        </time>
      </div>
    </article>
  )
}

function Action({
  label,
  count,
  active,
  activeClass,
  onClick,
  onCount,
  children,
}: {
  label: string
  count?: number
  active?: boolean
  activeClass?: string
  onClick: () => void
  onCount?: () => void
  children: React.ReactNode
}) {
  return (
    <span className={cn('flex items-center text-sm font-semibold', active && activeClass)}>
      <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className="flex size-10 items-center justify-center rounded-full hover:bg-secondary">
        {children}
      </button>
      {count !== undefined ? (
        onCount ? (
          <button type="button" onClick={onCount} aria-label={`Ver quiénes: ${label}`} className="-ml-1 pr-1.5 text-foreground underline-offset-2 hover:underline">
            {compactNumber(count)}
          </button>
        ) : (
          <span className="-ml-1 pr-1.5 text-foreground">{compactNumber(count)}</span>
        )
      ) : null}
    </span>
  )
}

type PeopleTab = 'like' | 'apoyo' | 'repost' | 'view'

function PeopleSheet({ post, onClose }: { post: ViewerPost; onClose: () => void }) {
  const nav = useNav()
  const [tab, setTab] = useState<PeopleTab>('like')
  const { data, mutate, isLoading } = useSWR(['reactors', post.id, tab], () => load('getReactors', post.id, tab))
  const tabs: { id: PeopleTab; label: string; total: number }[] = [
    { id: 'like', label: 'Me gusta', total: post.likes },
    { id: 'apoyo', label: 'Apoyos', total: post.apoyos },
    { id: 'repost', label: 'Recompartidos', total: post.reposts },
    ...(post.mine ? [{ id: 'view' as const, label: 'Vistas', total: post.views }] : []),
  ]
  const listed = data?.length ?? 0
  const total = tabs.find((t) => t.id === tab)?.total ?? 0

  return (
    <Sheet title="Interacciones" onClose={onClose} tall>
      <div role="tablist" className="-mx-5 -mt-4 mb-3 flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn('flex-1 border-b-2 py-3 text-xs font-semibold', tab === t.id ? 'border-foreground' : 'border-transparent text-muted-foreground')}
          >
            {t.label} {compactNumber(t.total)}
          </button>
        ))}
      </div>
      {isLoading ? <Loader2 className="mx-auto my-8 size-5 animate-spin text-muted-foreground" /> : null}
      <ul className="flex flex-col gap-1">
        {data?.map((p) => (
          <li key={p.key} className="flex items-center gap-3 py-2">
            <button type="button" onClick={() => (onClose(), nav.openProfile(p.key))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <PartyAvatar party={p} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{p.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {p.subtitle} · {timeAgo(p.at)}
                </span>
              </span>
            </button>
            {!p.isMe && nav.role !== 'invitado' ? (
              <button
                type="button"
                onClick={async () => {
                  mutate(data?.map((d) => (d.key === p.key ? { ...d, following: !d.following } : d)), { revalidate: false })
                  await toggleFollow(p.key)
                }}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', p.following ? 'bg-secondary' : 'bg-olympic-blue text-olympic-white')}
              >
                {p.following ? 'Siguiendo' : 'Seguir'}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {data && total > listed ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          {listed ? `y ${compactNumber(total - listed)} más` : `${compactNumber(total)} en total`}
        </p>
      ) : null}
      {data && !total ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía nadie.</p> : null}
    </Sheet>
  )
}

const AMOUNTS = [1000, 2500, 5000, 10000]

function DonateSheet({ post, onClose, onDone }: { post: ViewerPost; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(2500)
  const [custom, setCustom] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = custom ? Number(custom.replace(/\D/g, '')) : amount
  const first = post.author.name.split(' ')[0]

  async function submit() {
    setPending(true)
    setError(null)
    const res = await pledgeDonation(post.id, value)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setDone(true)
    onDone()
  }

  return (
    <Sheet title={`Donar a ${first}`} onClose={onClose}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Gift className="size-10 text-olympic-green" />
          <p className="font-display text-lg font-semibold">¡Gracias por querer apoyar a {first}!</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Los pagos dentro de BoostSport todavía no están habilitados. Guardamos tu intención de donar y te avisamos apenas puedas completarla.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Tu aporte ayuda a {first} con viajes, equipamiento e inscripciones.</p>
          <div className="grid grid-cols-2 gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={!custom && amount === a}
                onClick={() => (setCustom(''), setAmount(a))}
                className={cn('rounded-xl py-3 font-display text-lg font-semibold', !custom && amount === a ? 'bg-olympic-green text-olympic-white' : 'bg-secondary')}
              >
                $ {a.toLocaleString('es-AR')}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Otro monto (ARS)
            <input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="numeric" placeholder="$" className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground" />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button type="button" onClick={submit} disabled={pending || !value} className="flex items-center justify-center gap-2 rounded-full bg-olympic-green px-5 py-3 font-bold text-olympic-white disabled:opacity-50">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            Quiero donar $ {value ? value.toLocaleString('es-AR') : 0}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">Todavía no se cobra nada: los pagos llegan pronto.</p>
        </div>
      )}
    </Sheet>
  )
}

const REASONS = ['Spam', 'Contenido inapropiado', 'Información falsa', 'Acoso', 'Otro']

function MenuSheet({ post, onClose, onRemoved }: { post: ViewerPost; onClose: () => void; onRemoved: () => void }) {
  const [done, setDone] = useState<string | null>(null)
  return (
    <Sheet title={post.mine ? 'Tu publicación' : 'Reportar publicación'} onClose={onClose}>
      {post.mine ? (
        <button
          type="button"
          onClick={async () => {
            await deletePost(post.id)
            globalMutate('companeros')
            onRemoved()
            onClose()
          }}
          className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left font-semibold text-destructive"
        >
          <Trash2 className="size-5" />
          Eliminar publicación
        </button>
      ) : done ? (
        <p className="text-sm leading-relaxed">{done}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">¿Por qué querés reportarla?</p>
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={async () => {
                const res = await reportPost(post.id, r)
                setDone(res.ok ? 'Gracias. Revisaremos la publicación.' : res.error)
              }}
              className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-semibold"
            >
              <Flag className="size-4 text-olympic-red" />
              {r}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
