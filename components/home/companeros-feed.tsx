'use client'

import { useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Bookmark, Flag, HandHeart, Heart, ImagePlus, Loader2, MessageCircle, MoreHorizontal, Music2, Plus, Send, Share2, Trash2, X } from 'lucide-react'
import {
  addComment,
  createPost,
  deletePost,
  getComments,
  getCompanerosFeed,
  reportPost,
  toggleReaction,
  type FeedPost,
} from '@/app/actions/social'
import type { DailyKind } from '@/lib/catalog'
import { useNav } from '@/components/app/nav'
import { storeMedia } from '@/lib/upload'
import { SaveFolderSheet, SavedToast } from '@/components/saved/save-folders'
import { ShareSheet } from '@/components/share/share-sheet'
import { PartyAvatar, Sheet, compactNumber, compressImage, isComposing, timeAgo } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/settings/use-settings'
import { load } from '@/lib/load'

const kindMeta: Record<DailyKind, { label: string; className: string }> = {
  diario: { label: 'Mi día', className: 'bg-olympic-blue text-olympic-white' },
  idea: { label: 'Idea', className: 'bg-olympic-yellow text-olympic-black' },
  colab: { label: 'Colab', className: 'bg-olympic-green text-olympic-white' },
  meta: { label: 'Meta', className: 'bg-olympic-red text-olympic-white' },
}

export function CompanerosFeed() {
  const nav = useNav()
  const { data, isLoading, mutate } = useSWR('companeros', () => load('getCompanerosFeed'))
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null)
  const [menuFor, setMenuFor] = useState<FeedPost | null>(null)
  const [composing, setComposing] = useState(false)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [sharing, setSharing] = useState<FeedPost | null>(null)
  const [folderFor, setFolderFor] = useState<string | null>(null)
  const { settings } = useSettings(nav.role !== 'invitado')
  const hideCounts = settings.feed.hideLikeCounts

  async function react(post: FeedPost, kind: 'like' | 'apoyo') {
    if (!nav.requireAccount()) return
    const flag = kind === 'like' ? 'liked' : 'supported'
    const total = kind === 'like' ? 'likes' : 'apoyos'
    mutate(
      (prev) => prev?.map((p) => (p.id === post.id ? { ...p, [flag]: !p[flag], [total]: p[total] + (p[flag] ? -1 : 1) } : p)),
      { revalidate: false },
    )
    await toggleReaction(post.id, kind)
    mutate()
  }

  async function save(post: FeedPost) {
    if (!nav.requireAccount()) return
    mutate((prev) => prev?.map((p) => (p.id === post.id ? { ...p, saved: !p.saved } : p)), { revalidate: false })
    setSavedToast(post.saved ? null : post.id)
    await toggleReaction(post.id, 'guardado')
    globalMutate('saved')
  }

  function share(post: FeedPost) {
    setSharing(post)
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando publicaciones" />
      </div>
    )
  }

  return (
    <>
      {data.map((post, index) => (
        <article key={post.id} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
          {post.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image} alt="" loading={index > 1 ? 'lazy' : 'eager'} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div aria-hidden className={cn('absolute inset-0 opacity-30', kindMeta[post.kind].className)} />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />

          <div className="relative flex h-full items-end gap-3 px-4 pb-24 pt-36">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <button type="button" onClick={() => nav.openProfile(post.author.key)} className="flex items-center gap-2 self-start text-left">
                <PartyAvatar party={post.author} className="size-9" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-sm font-semibold">{post.author.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {post.author.subtitle} · {timeAgo(post.createdAt)}
                  </span>
                </span>
              </button>
              <span className={cn('self-start rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', kindMeta[post.kind].className)}>
                {kindMeta[post.kind].label}
              </span>
              <p className={cn('text-pretty leading-relaxed', post.image ? 'text-sm' : 'font-display text-2xl font-semibold leading-snug')}>{post.body}</p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-4">
              <RailButton label="Me gusta" count={hideCounts && !post.mine ? undefined : post.likes} active={post.liked} activeClass="text-olympic-red" onClick={() => react(post, 'like')}>
                <Heart className={cn('size-6', post.liked && 'fill-current')} />
              </RailButton>
              <RailButton label="Apoyar" count={hideCounts && !post.mine ? undefined : post.apoyos} active={post.supported} activeClass="text-olympic-yellow" onClick={() => react(post, 'apoyo')}>
                <HandHeart className={cn('size-6', post.supported && 'fill-current')} />
              </RailButton>
              <RailButton label="Comentarios" count={post.comments} onClick={() => setCommentsFor(post)}>
                <MessageCircle className="size-6" />
              </RailButton>
              <RailButton label={post.saved ? 'Quitar de guardados' : 'Guardar'} active={post.saved} activeClass="text-olympic-yellow" onClick={() => save(post)}>
                <Bookmark className={cn('size-6', post.saved && 'fill-current')} />
              </RailButton>
              <RailButton label="Compartir" onClick={() => share(post)}>
                <Share2 className="size-6" />
              </RailButton>
              <RailButton label="Más opciones" onClick={() => (nav.requireAccount() ? setMenuFor(post) : null)}>
                <MoreHorizontal className="size-6" />
              </RailButton>
            </div>
          </div>
        </article>
      ))}

      {nav.role === 'deportista' ? (
        <button
          type="button"
          onClick={() => setComposing(true)}
          aria-label="Nueva publicación"
  className="absolute right-4 top-28 z-20 flex size-11 items-center justify-center rounded-full bg-olympic-blue text-olympic-white shadow-lg"
  >
  <Plus className="size-5" />
        </button>
      ) : null}

      {commentsFor ? <CommentsSheet post={commentsFor} onClose={() => setCommentsFor(null)} onAdded={() => mutate()} /> : null}
      {menuFor ? <PostMenu post={menuFor} onClose={() => setMenuFor(null)} onDone={() => mutate()} /> : null}
      {composing ? <Composer onClose={() => setComposing(false)} onPosted={() => mutate()} /> : null}
      {savedToast ? <SavedToast onChoose={() => (setFolderFor(savedToast), setSavedToast(null))} onDone={() => setSavedToast(null)} /> : null}
      {folderFor ? <SaveFolderSheet targetId={folderFor} onClose={() => setFolderFor(null)} /> : null}
      {sharing ? (
        <ShareSheet
          item={{
            text: `${sharing.author.name} en BoostSport: ${sharing.body.slice(0, 120)}`,
            url: `${window.location.origin}/?perfil=${encodeURIComponent(sharing.author.key)}&post=${encodeURIComponent(sharing.id)}`,
            title: sharing.author.name,
            subtitle: sharing.body,
            image: sharing.image,
          }}
          onClose={() => setSharing(null)}
        />
      ) : null}
    </>
  )
}

function RailButton({
  label,
  count,
  active,
  activeClass,
  onClick,
  children,
}: {
  label: string
  count?: number
  active?: boolean
  activeClass?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className={cn('flex flex-col items-center gap-1 text-xs font-semibold', active && activeClass)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-background/50 backdrop-blur">{children}</span>
      {count !== undefined ? <span className="text-foreground">{compactNumber(count)}</span> : null}
    </button>
  )
}

export function CommentsSheet({ post, onClose, onAdded }: { post: Pick<FeedPost, 'id'>; onClose: () => void; onAdded: () => void }) {
  const nav = useNav()
  const { data, mutate } = useSWR(['comments', post.id], () => load('getComments', post.id))
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!text.trim() || pending || !nav.requireAccount()) return
    setPending(true)
    setError(null)
    const res = await addComment(post.id, text)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setText('')
    mutate()
    onAdded()
  }

  return (
    <Sheet title="Comentarios" onClose={onClose} tall>
      <ul className="flex flex-1 flex-col gap-4">
        {data?.length === 0 ? <li className="text-sm text-muted-foreground">Sé el primero en comentar.</li> : null}
        {data?.map((c) => (
          <li key={c.id} className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">
              {c.author} <span className="font-normal text-muted-foreground">· {timeAgo(c.createdAt)}</span>
            </span>
            <p className="text-sm leading-relaxed">{c.body}</p>
          </li>
        ))}
      </ul>
      {nav.role !== 'invitado' ? (
        <form
          className="sticky bottom-0 mt-4 flex flex-col gap-2 bg-card pt-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex items-center gap-2">
            <label htmlFor="comment" className="sr-only">
              Escribí un comentario
            </label>
            <input
              id="comment"
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing(e)) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Compartí una idea o un aliento…"
              className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-3 text-sm"
            />
            <button type="submit" disabled={pending || !text.trim()} aria-label="Enviar comentario" className="flex size-11 items-center justify-center rounded-full bg-olympic-blue text-olympic-white disabled:opacity-50">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </form>
      ) : null}
    </Sheet>
  )
}

const reasons = ['Spam', 'Contenido inapropiado', 'Información falsa', 'Acoso', 'Otro']

function PostMenu({ post, onClose, onDone }: { post: FeedPost; onClose: () => void; onDone: () => void }) {
  const [done, setDone] = useState<string | null>(null)

  async function report(reason: string) {
    const res = await reportPost(post.id, reason)
    setDone(res.ok ? 'Gracias. Revisaremos la publicación y ya no la vas a ver en tu feed.' : res.error)
    onDone()
  }

  async function remove() {
    await deletePost(post.id)
    onDone()
    onClose()
  }

  return (
    <Sheet title={post.mine ? 'Tu publicación' : 'Reportar publicación'} onClose={onClose}>
      {post.mine ? (
        <button type="button" onClick={remove} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left font-semibold text-destructive">
          <Trash2 className="size-5" />
          Eliminar publicación
        </button>
      ) : done ? (
        <p className="text-sm leading-relaxed">{done}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">¿Por qué querés reportarla?</p>
          {reasons.map((r) => (
            <button key={r} type="button" onClick={() => report(r)} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-semibold">
              <Flag className="size-4 text-olympic-red" />
              {r}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}

const STEPS = ['Foto', 'Texto', 'Audio'] as const

export function Composer({ onClose, onPosted, initialKind = 'diario' }: { onClose: () => void; onPosted: () => void; initialKind?: DailyKind }) {
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<DailyKind>(initialKind)
  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [audio, setAudio] = useState<{ data: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Elegí una imagen.')
    setUploading(true)
    try {
      setImage(await storeMedia('post-image', await compressImage(file)))
      setError(null)
    } catch {
      setError('No pudimos subir la imagen. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function pickAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('audio/')) return setError('Elegí un archivo de audio (mp3, m4a, ogg o wav).')
    if (file.size > 10 * 1024 * 1024) return setError('El audio puede pesar hasta 10 MB.')
    setUploading(true)
    setError(null)
    try {
      const url = await storeMedia('post-audio', file)
      // Without Blob the audio goes in the database, which only fits small files.
      if (url.startsWith('data:') && file.size > 2 * 1024 * 1024) return setError('Por ahora el audio puede pesar hasta 2 MB.')
      setAudio({ data: url, name: file.name.replace(/\.[^.]+$/, '').slice(0, 80) })
    } catch {
      setError('No pudimos subir el audio. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function next() {
    if (step === 1 && body.trim().length < 2) return setError('Escribí algo sobre tu día.')
    setError(null)
    setStep((s) => Math.min(2, s + 1))
  }

  async function publish() {
    if (body.trim().length < 2) return (setStep(1), setError('Escribí algo sobre tu día.'))
    setPending(true)
    const res = await createPost({ kind, body, image, audio })
    setPending(false)
    if (!res.ok) return setError(res.error)
    if (res.warning) window.alert(res.warning)
    onPosted()
    onClose()
  }

  return (
    <Sheet title="Publicar" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ol className="flex items-center gap-2" aria-label="Pasos">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 flex-col gap-1.5">
              <span className={cn('h-1 rounded-full', i <= step ? 'bg-olympic-blue' : 'bg-secondary')} />
              <span className={cn('text-[11px] font-semibold', i === step ? 'text-foreground' : 'text-muted-foreground')} aria-current={i === step ? 'step' : undefined}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">Empezá por la foto. Si no tenés, podés publicar solo texto.</p>
            {image ? (
              <div className="relative overflow-hidden rounded-xl bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Vista previa" className="max-h-72 w-full object-contain" />
                <button type="button" onClick={() => setImage(null)} aria-label="Quitar imagen" className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-background/80">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input py-12 text-sm font-semibold text-muted-foreground">
                <ImagePlus className="size-8" />
                Elegir foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={pick} tabIndex={-1} aria-hidden />
          </>
        ) : null}

        {step === 1 ? (
          <>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-20 w-20 rounded-lg object-cover" />
            ) : null}
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-2 text-sm font-semibold">¿Qué querés compartir?</legend>
              {(Object.keys(kindMeta) as DailyKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cn('rounded-full px-3 py-1.5 text-xs font-bold uppercase', kind === k ? kindMeta[k].className : 'bg-secondary text-muted-foreground')}
                >
                  {kindMeta[k].label}
                </button>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Texto
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                rows={5}
                autoFocus
                placeholder="Hoy entrené…"
                className="rounded-xl border border-input bg-background px-4 py-3 font-normal leading-relaxed"
              />
              <span className="self-end text-xs font-normal text-muted-foreground">{body.length}/500</span>
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="text-sm text-muted-foreground">Sumale un audio o una canción. Es opcional.</p>
            {audio ? (
              <div className="flex flex-col gap-2 rounded-xl bg-secondary p-3">
                <div className="flex items-center gap-2">
                  <Music2 className="size-4 shrink-0" />
                  <input
                    value={audio.name}
                    onChange={(e) => setAudio({ ...audio, name: e.target.value.slice(0, 80) })}
                    aria-label="Nombre del audio o canción"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                  />
                  <button type="button" onClick={() => setAudio(null)} aria-label="Quitar audio" className="flex size-7 items-center justify-center rounded-full bg-background/80">
                    <X className="size-3.5" />
                  </button>
                </div>
                <audio src={audio.data} controls className="h-8 w-full" />
              </div>
            ) : (
              <button type="button" onClick={() => audioRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input py-10 text-sm font-semibold text-muted-foreground">
                <Music2 className="size-8" />
                Elegir audio o canción
              </button>
            )}
            <input ref={audioRef} type="file" accept="audio/*" className="sr-only" onChange={pickAudio} tabIndex={-1} aria-hidden />
            <p className="-mt-2 text-[11px] leading-relaxed text-muted-foreground">Usá audios propios o música que tengas derecho a compartir. Hasta 2 MB.</p>
          </>
        ) : null}

        {uploading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Subiendo…
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          {step > 0 ? (
            <button type="button" onClick={() => (setError(null), setStep((s) => s - 1))} className="rounded-full bg-secondary px-5 py-3 font-bold">
              Atrás
            </button>
          ) : null}
          {step < 2 ? (
            <button type="button" onClick={next} disabled={uploading} className="flex-1 rounded-full disabled:opacity-60 bg-olympic-blue px-5 py-3 font-bold text-olympic-white">
              {step === 0 && !image ? 'Seguir sin foto' : 'Siguiente'}
            </button>
          ) : (
            <button type="button" onClick={publish} disabled={pending || uploading} className="flex-1 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white disabled:opacity-60">
              {pending ? 'Publicando…' : audio ? 'Publicar' : 'Publicar sin audio'}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
