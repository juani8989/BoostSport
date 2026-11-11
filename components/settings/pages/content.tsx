'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Archive, ArchiveRestore, Bookmark, CalendarCheck, Clock, HandHeart, Heart, History, MessageCircle, Trash2, UserMinus, Users } from 'lucide-react'
import { getMyActivity, getMyPosts, getSaved, removeMyComment, undoReaction, unfollow, type TargetPreview } from '@/app/actions/settings'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, timeAgo } from '@/components/app/kit'
import { useSettings } from '@/components/settings/use-settings'
import { Empty, Loading, Page, Row, Section, Tabs, dateLabel } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'
import { load } from '@/lib/load'

function Thumb({ item }: { item: Pick<TargetPreview, 'image' | 'title'> }) {
  return item.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary p-1 text-center text-[9px] leading-tight text-muted-foreground">{item.title.slice(0, 40)}</span>
  )
}

function PreviewRow({ item, action, onOpen }: { item: TargetPreview; action?: React.ReactNode; onOpen?: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <button type="button" onClick={onOpen} disabled={!onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Thumb item={item} />
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2 text-sm leading-snug">{item.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {item.subtitle} · {timeAgo(item.at)}
          </span>
        </span>
      </button>
      {action}
    </li>
  )
}

const savedFilters = [
  { value: 'todo', label: 'Todo' },
  { value: 'publicacion', label: 'Posts' },
  { value: 'evento', label: 'Eventos' },
  { value: 'deportista', label: 'Atletas' },
] as const

export function SavedPage({ back, close }: PageProps) {
  const nav = useNav()
  const { data, mutate, isLoading } = useSWR('saved', () => load('getSaved'))
  const [filter, setFilter] = useState<(typeof savedFilters)[number]['value']>('todo')
  const items = (data ?? []).filter((i) => filter === 'todo' || i.kind === filter)

  return (
    <Page title="Guardados" onBack={back}>
      <Tabs value={filter} options={[...savedFilters]} onChange={setFilter} />
      {isLoading ? <Loading /> : null}
      {data && !items.length ? (
        <Empty icon={Bookmark} title="Todavía no guardaste nada">
          Tocá el ícono de guardar en una publicación de Compañeros para encontrarla acá. Solo vos ves lo que guardás.
        </Empty>
      ) : null}
      <ul className="flex flex-col py-2">
        {items.map((item) => (
          <PreviewRow
            key={item.targetId}
            item={item}
            onOpen={
              item.authorKey
                ? () => {
                    close()
                    nav.openProfile(item.authorKey!)
                  }
                : undefined
            }
            action={
              <button
                type="button"
                aria-label="Quitar de guardados"
                onClick={async () => {
                  mutate(data?.filter((d) => d.targetId !== item.targetId), { revalidate: false })
                  await undoReaction(item.targetId, 'guardado')
                  globalMutate('companeros')
                }}
                className="flex size-9 items-center justify-center rounded-full"
              >
                <Bookmark className="size-5 fill-current" />
              </button>
            }
          />
        ))}
      </ul>
    </Page>
  )
}

export function ArchivePage({ back }: PageProps) {
  const { setMember } = useSettings()
  const { data, mutate, isLoading } = useSWR('my-posts', () => load('getMyPosts'))
  const [tab, setTab] = useState<'archivadas' | 'publicadas'>('archivadas')
  const items = (data ?? []).filter((p) => (tab === 'archivadas' ? p.archived : !p.archived))

  async function toggle(id: string, archive: boolean) {
    mutate(data?.map((p) => (p.id === id ? { ...p, archived: archive } : p)), { revalidate: false })
    await setMember('archived', id, archive)
    globalMutate('companeros')
  }

  return (
    <Page title="Archivo" onBack={back}>
      <Tabs
        value={tab}
        options={[
          { value: 'archivadas', label: `Archivadas${data ? ` (${data.filter((p) => p.archived).length})` : ''}` },
          { value: 'publicadas', label: 'Publicadas' },
        ]}
        onChange={setTab}
      />
      <p className="px-4 pt-3 text-xs leading-relaxed text-muted-foreground">
        Archivar oculta una publicación del feed y de tu perfil sin borrarla. Conserva sus me gusta y comentarios, y la podés volver a mostrar cuando quieras.
      </p>
      {isLoading ? <Loading /> : null}
      {data && !items.length ? (
        <Empty icon={Archive} title={tab === 'archivadas' ? 'No tenés publicaciones archivadas' : 'No tenés publicaciones visibles'} />
      ) : null}
      <ul className="flex flex-col py-2">
        {items.map((p) => (
          <PreviewRow
            key={p.id}
            item={{ targetId: p.id, title: p.body, subtitle: `${p.likes} me gusta · ${p.comments} comentarios`, image: p.image ?? undefined, kind: 'publicacion', at: p.createdAt }}
            action={
              <button
                type="button"
                onClick={() => toggle(p.id, !p.archived)}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
              >
                {p.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {p.archived ? 'Mostrar' : 'Archivar'}
              </button>
            }
          />
        ))}
      </ul>
    </Page>
  )
}

type ActivityTab = 'interacciones' | 'comentarios' | 'seguidos' | 'historial'

export function ActivityPage({ back, close }: PageProps) {
  const nav = useNav()
  const { data, mutate, isLoading } = useSWR('activity', () => load('getMyActivity'))
  const [tab, setTab] = useState<ActivityTab>('interacciones')
  const [kind, setKind] = useState<'like' | 'apoyo' | 'asistir'>('like')

  const list = data ? (kind === 'like' ? data.likes : kind === 'apoyo' ? data.apoyos : data.events) : []

  return (
    <Page title="Tu actividad" onBack={back}>
      {data ? (
        <div className="grid grid-cols-4 gap-2 px-4 py-4 text-center">
          {[
            { icon: Heart, n: data.likes.length, label: 'Me gusta' },
            { icon: MessageCircle, n: data.comments.length, label: 'Comentarios' },
            { icon: Users, n: data.following.length, label: 'Seguidos' },
            { icon: HandHeart, n: data.swipes.liked, label: 'Interés' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl bg-secondary py-3">
              <s.icon className="size-5" />
              <span className="font-display text-lg font-semibold">{s.n}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Tabs
        value={tab}
        options={[
          { value: 'interacciones', label: 'Reacciones' },
          { value: 'comentarios', label: 'Comentarios' },
          { value: 'seguidos', label: 'Seguidos' },
          { value: 'historial', label: 'Historial' },
        ]}
        onChange={setTab}
      />
      {isLoading ? <Loading /> : null}

      {data && tab === 'interacciones' ? (
        <>
          <div className="flex gap-2 px-4 pt-3">
            {([
              ['like', 'Me gusta', Heart],
              ['apoyo', 'Apoyos', HandHeart],
              ['asistir', 'Eventos', CalendarCheck],
            ] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${kind === k ? 'bg-foreground text-background' : 'bg-secondary'}`}>
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          {!list.length ? <Empty icon={Heart} title="Nada por acá todavía" /> : null}
          <ul className="flex flex-col py-2">
            {list.map((item) => (
              <PreviewRow
                key={`${kind}-${item.targetId}`}
                item={item}
                onOpen={item.authorKey ? () => (close(), nav.openProfile(item.authorKey!)) : undefined}
                action={
                  <button
                    type="button"
                    onClick={async () => {
                      await undoReaction(item.targetId, kind)
                      mutate()
                      globalMutate('companeros')
                    }}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    Deshacer
                  </button>
                }
              />
            ))}
          </ul>
        </>
      ) : null}

      {data && tab === 'comentarios' ? (
        <ul className="flex flex-col py-2">
          {!data.comments.length ? <Empty icon={MessageCircle} title="No escribiste comentarios" /> : null}
          {data.comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm leading-relaxed">“{c.body}”</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.target ? `En: ${c.target.title.slice(0, 50)}` : 'Publicación'} · {timeAgo(c.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Eliminar comentario"
                onClick={async () => {
                  await removeMyComment(c.id)
                  mutate()
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {data && tab === 'seguidos' ? (
        <ul className="flex flex-col py-2">
          {!data.following.length ? <Empty icon={Users} title="Todavía no seguís a nadie" /> : null}
          {data.following.map((p) => (
            <li key={p.key} className="flex items-center gap-3 px-4 py-2.5">
              <button type="button" onClick={() => (close(), nav.openProfile(p.key))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <PartyAvatar party={p} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className="truncate text-xs text-muted-foreground">Desde {dateLabel(p.since)}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await unfollow(p.key)
                  mutate()
                }}
                className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
              >
                <UserMinus className="size-3.5" />
                Dejar de seguir
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {data && tab === 'historial' ? (
        <Section hint={`En Match mostraste interés en ${data.swipes.liked} perfiles y pasaste ${data.swipes.passed}.`}>
          {data.history.map((h) => (
            <Row key={h.label} icon={h.label.startsWith('Última') ? Clock : History} label={h.label} value={dateLabel(h.at)} />
          ))}
        </Section>
      ) : null}
    </Page>
  )
}
