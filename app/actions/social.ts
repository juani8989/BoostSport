'use server'

import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { postImageSrc } from '@/lib/media'
import { db } from '@/lib/db'
import { comments, follows, postAudio, posts, reactions, reports } from '@/lib/db/schema'
import { describeParties, getViewer, requireViewer, userKey, type Party } from '@/lib/viewer'
import { events, seedAthleteKey, seedDaily, type DailyKind } from '@/lib/catalog'
import { getSettings, getSettingsMap } from '@/lib/user-settings'
import { isBlobUrl } from '@/lib/blob-url'

export type ReactionKind = 'like' | 'apoyo' | 'asistir' | 'guardado' | 'repost'

export type FeedPost = {
  id: string
  author: Party
  kind: DailyKind
  body: string
  image: string | null
  createdAt: string
  likes: number
  apoyos: number
  comments: number
  liked: boolean
  supported: boolean
  saved: boolean
  mine: boolean
  /** Who supported it: Apoyar works as a repost, so the post says who backs it. */
  boostedBy: { name: string; key: string; others: number } | null
}

export type FeedComment = { id: string; author: string; body: string; createdAt: string }

type Result = { ok: true } | { ok: false; error: string }

const DAILY_KINDS: DailyKind[] = ['diario', 'idea', 'colab', 'meta']
const REACTION_KINDS: ReactionKind[] = ['like', 'apoyo', 'asistir', 'guardado', 'repost']
const TARGET_PATTERN = /^(seed:d\d+|post:\d+|event:[a-z0-9-]+|athlete:(user:[\w-]+|seed:at-[a-z]+))$/
const MAX_IMAGE_CHARS = 1_400_000

function validTarget(targetId: string) {
  return typeof targetId === 'string' && TARGET_PATTERN.test(targetId)
}

async function reactionCounts(targetIds: string[], viewerId?: string) {
  const totals = new Map<string, Record<string, number>>()
  const mine = new Set<string>()
  if (!targetIds.length) return { totals, mine }

  const [rows, own] = await Promise.all([
    db
      .select({ targetId: reactions.targetId, kind: reactions.kind, n: count() })
      .from(reactions)
      .where(inArray(reactions.targetId, targetIds))
      .groupBy(reactions.targetId, reactions.kind),
    viewerId
      ? db
          .select({ targetId: reactions.targetId, kind: reactions.kind })
          .from(reactions)
          .where(and(eq(reactions.userId, viewerId), inArray(reactions.targetId, targetIds)))
      : Promise.resolve([]),
  ])
  for (const row of rows) {
    const entry = totals.get(row.targetId) ?? {}
    entry[row.kind] = Number(row.n)
    totals.set(row.targetId, entry)
  }
  for (const row of own) mine.add(`${row.targetId}|${row.kind}`)
  return { totals, mine }
}

export async function getCompanerosFeed(): Promise<FeedPost[]> {
  // Two waves of parallel queries instead of a chain: each round trip to the database counts.
  const [viewer, realPosts] = await Promise.all([getViewer(), db.select().from(posts).orderBy(desc(posts.createdAt)).limit(40)])
  const candidateIds = [...realPosts.map((p) => `post:${p.id}`), ...seedDaily.map((s) => s.id)]
  const [authorSettings, reported, { totals, mine }, commentRows, parties] = await Promise.all([
    getSettingsMap([...realPosts.map((p) => p.userId), ...(viewer ? [viewer.id] : [])]),
    viewer ? db.select({ targetId: reports.targetId }).from(reports).where(eq(reports.userId, viewer.id)) : Promise.resolve([]),
    reactionCounts(candidateIds, viewer?.id),
    db.select({ targetId: comments.targetId, n: count() }).from(comments).where(inArray(comments.targetId, candidateIds)).groupBy(comments.targetId),
    describeParties([...realPosts.map((p) => userKey(p.userId)), ...seedDaily.map((s) => seedAthleteKey(s.athleteId))]),
  ])
  // Latest supporters per post, for "Apoyado por …".
  const supportRows = await db
    .select({ targetId: reactions.targetId, userId: reactions.userId })
    .from(reactions)
    .where(and(inArray(reactions.targetId, candidateIds), eq(reactions.kind, 'apoyo')))
    .orderBy(desc(reactions.createdAt))
    .limit(400)
  const supporters = await describeParties([...new Set(supportRows.map((r) => userKey(r.userId)))])
  const supportBy = new Map<string, string[]>()
  for (const r of supportRows) supportBy.set(r.targetId, [...(supportBy.get(r.targetId) ?? []), userKey(r.userId)])

  const hidden = new Set<string>(reported.map((r) => r.targetId))
  const hiddenAuthors = new Set<string>()
  // Archived posts disappear from the feed, also for their author.
  for (const p of realPosts) if (authorSettings.get(p.userId)?.archived.includes(`post:${p.id}`)) hidden.add(`post:${p.id}`)
  if (viewer) {
    const mineSettings = authorSettings.get(viewer.id)
    for (const k of [...(mineSettings?.blocked ?? []), ...(mineSettings?.muted ?? [])]) hiddenAuthors.add(k)
    // Authors who blocked the viewer don't show up either.
    for (const [id, st] of authorSettings) if (id !== viewer.id && st.blocked.includes(viewer.key)) hiddenAuthors.add(userKey(id))
  }
  const commentTotals = new Map(commentRows.map((r) => [r.targetId, Number(r.n)]))

  const build = (id: string, author: Party | undefined, base: Omit<FeedPost, 'id' | 'author' | 'likes' | 'apoyos' | 'comments' | 'liked' | 'supported' | 'saved' | 'boostedBy'>, baseLikes = 0, baseComments = 0): FeedPost | null => {
    if (!author || hidden.has(id) || hiddenAuthors.has(author.key)) return null
    const t = totals.get(id) ?? {}
    return {
      id,
      author,
      ...base,
      likes: baseLikes + (t.like ?? 0),
      apoyos: Math.round(baseLikes / 6) + (t.apoyo ?? 0),
      comments: baseComments + (commentTotals.get(id) ?? 0),
      liked: mine.has(`${id}|like`),
      supported: mine.has(`${id}|apoyo`),
      saved: mine.has(`${id}|guardado`),
      boostedBy: (() => {
        const keys = (supportBy.get(id) ?? []).filter((k) => !hiddenAuthors.has(k))
        const who = keys.map((k) => supporters.get(k)).find(Boolean)
        return who ? { name: who.name, key: who.key, others: keys.length - 1 } : null
      })(),
    }
  }

  const now = Date.now()
  const feed = [
    ...realPosts.map((p) =>
      build(`post:${p.id}`, parties.get(userKey(p.userId)), {
        kind: p.kind as DailyKind,
        body: p.body,
        image: postImageSrc(p.id, p.mediaUrl),
        createdAt: p.createdAt.toISOString(),
        mine: p.userId === viewer?.id,
      }),
    ),
    ...seedDaily.map((s) =>
      build(
        s.id,
        parties.get(seedAthleteKey(s.athleteId)),
        { kind: s.kind, body: s.body, image: s.image, createdAt: new Date(now - s.minutesAgo * 60_000).toISOString(), mine: false },
        s.baseLikes,
        s.baseComments.length,
      ),
    ),
  ].filter((p): p is FeedPost => p !== null)

  // Apoyar gives reach: each real supporter moves the post up as if it were two hours newer (up to 50).
  const BOOST_MS = 2 * 60 * 60 * 1000
  const rank = (p: FeedPost) => new Date(p.createdAt).getTime() + Math.min(totals.get(p.id)?.apoyo ?? 0, 50) * BOOST_MS
  return feed.sort((a, b) => rank(b) - rank(a))
}

const MAX_AUDIO_CHARS = 2_800_000 // about 2 MB of audio, roughly a minute and a half

export async function createPost(input: { kind: DailyKind; body: string; image?: string | null; audio?: { data: string; name: string } | null }): Promise<Result & { warning?: string }> {
  const viewer = await requireViewer()
  if (viewer.role !== 'deportista') return { ok: false, error: 'Solo los deportistas pueden publicar en Compañeros.' }

  const body = typeof input.body === 'string' ? input.body.trim() : ''
  if (!DAILY_KINDS.includes(input.kind)) return { ok: false, error: 'Tipo de publicación inválido.' }
  if (body.length < 2 || body.length > 500) return { ok: false, error: 'Escribí entre 2 y 500 caracteres.' }

  const image = input.image ?? null
  // Photos go to Vercel Blob; data URLs remain the fallback while Blob isn't set up.
  if (image && !isBlobUrl(image) && (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS)) {
    return { ok: false, error: 'La imagen no es válida o es muy pesada.' }
  }

  const audio = input.audio ?? null
  if (audio && !isBlobUrl(audio.data) && (!/^data:audio\/(mpeg|mp3|mp4|x-m4a|aac|ogg|webm|wav|x-wav);base64,/.test(audio.data) || audio.data.length > MAX_AUDIO_CHARS)) {
    return { ok: false, error: 'El audio no es válido o pesa más de 2 MB.' }
  }

  const [created] = await db.insert(posts).values({ userId: viewer.id, authorName: viewer.name, kind: input.kind, body, mediaUrl: image }).returning({ id: posts.id })
  if (audio) {
    try {
      await db.insert(postAudio).values({ postId: created.id, audioUrl: audio.data, audioName: String(audio.name ?? '').trim().slice(0, 80) })
    } catch (error) {
      console.error('post audio not saved', error)
      return { ok: true, warning: 'Publicamos tu post, pero el audio todavía no se puede guardar.' }
    }
  }
  return { ok: true }
}

export async function deletePost(postId: string): Promise<Result> {
  const viewer = await requireViewer()
  const id = Number(postId.replace(/^post:/, ''))
  if (!Number.isInteger(id)) return { ok: false, error: 'Publicación inválida.' }
  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, viewer.id)))
  return { ok: true }
}

export async function toggleReaction(targetId: string, kind: ReactionKind): Promise<Result> {
  const viewer = await requireViewer()
  if (!validTarget(targetId) || !REACTION_KINDS.includes(kind)) return { ok: false, error: 'Acción inválida.' }

  const removed = await db
    .delete(reactions)
    .where(and(eq(reactions.targetId, targetId), eq(reactions.userId, viewer.id), eq(reactions.kind, kind)))
    .returning({ targetId: reactions.targetId })
  if (!removed.length) await db.insert(reactions).values({ targetId, userId: viewer.id, kind })
  return { ok: true }
}

async function postOwner(targetId: string) {
  if (!targetId.startsWith('post:')) return null
  const [row] = await db.select({ userId: posts.userId }).from(posts).where(eq(posts.id, Number(targetId.slice(5)))).limit(1)
  return row?.userId ?? null
}

export async function getComments(targetId: string): Promise<FeedComment[]> {
  if (!validTarget(targetId)) return []
  const seed = seedDaily.find((s) => s.id === targetId)
  const seedComments: FeedComment[] = (seed?.baseComments ?? []).map((c, i) => ({
    id: `${targetId}-c${i}`,
    author: c.author,
    body: c.body,
    createdAt: new Date(Date.now() - (seed!.minutesAgo - 5 - i) * 60_000).toISOString(),
  }))
  const [rows, owner, viewer] = await Promise.all([
    db.select().from(comments).where(eq(comments.targetId, targetId)).orderBy(comments.createdAt).limit(100),
    postOwner(targetId),
    getViewer(),
  ])
  const [ownerSettings, viewerSettings] = await Promise.all([owner ? getSettings(owner) : null, viewer ? getSettings(viewer.id) : null])
  const words = ownerSettings?.interactions.hiddenWords ?? []
  const hiddenUsers = new Set([...(viewerSettings?.blocked ?? []), ...(viewerSettings?.muted ?? []), ...(ownerSettings?.blocked ?? [])].filter((k) => k.startsWith('user:')).map((k) => k.slice(5)))
  const visible = rows.filter((r) => {
    if (hiddenUsers.has(r.userId)) return false
    // The author's restricted people and hidden words only show to the commenter.
    if (r.userId === viewer?.id) return true
    if (ownerSettings?.restricted.includes(userKey(r.userId))) return false
    const text = r.body.toLowerCase()
    return !words.some((w) => text.includes(w))
  })
  return [...seedComments, ...visible.map((r) => ({ id: String(r.id), author: r.authorName, body: r.body, createdAt: r.createdAt.toISOString() }))]
}

export async function addComment(targetId: string, body: string): Promise<Result> {
  const viewer = await requireViewer()
  const text = typeof body === 'string' ? body.trim() : ''
  if (!validTarget(targetId)) return { ok: false, error: 'Publicación inválida.' }
  if (!text || text.length > 300) return { ok: false, error: 'El comentario debe tener entre 1 y 300 caracteres.' }
  const owner = await postOwner(targetId)
  if (owner && owner !== viewer.id) {
    const st = await getSettings(owner)
    if (st.blocked.includes(viewer.key)) return { ok: false, error: 'No podés comentar esta publicación.' }
    if (st.interactions.comments === 'nadie') return { ok: false, error: 'Los comentarios están desactivados en esta publicación.' }
    if (st.interactions.comments === 'seguidos') {
      const [f] = await db.select({ t: follows.targetId }).from(follows).where(and(eq(follows.followerId, owner), eq(follows.targetId, viewer.key))).limit(1)
      if (!f) return { ok: false, error: 'Solo las personas que sigue pueden comentar.' }
    }
  }
  await db.insert(comments).values({ targetId, userId: viewer.id, authorName: viewer.name, body: text })
  return { ok: true }
}

const REPORT_REASONS = ['Spam', 'Contenido inapropiado', 'Información falsa', 'Acoso', 'Otro']

export async function reportPost(targetId: string, reason: string): Promise<Result> {
  const viewer = await requireViewer()
  if (!validTarget(targetId) || !REPORT_REASONS.includes(reason)) return { ok: false, error: 'Denuncia inválida.' }
  await db.insert(reports).values({ targetId, userId: viewer.id, reason }).onConflictDoNothing()
  return { ok: true }
}

export async function toggleFollow(targetKey: string): Promise<Result> {
  const viewer = await requireViewer()
  if (!/^(user:[\w-]+|seed:at-[a-z]+)$/.test(targetKey) || targetKey === viewer.key) return { ok: false, error: 'Acción inválida.' }
  const removed = await db
    .delete(follows)
    .where(and(eq(follows.followerId, viewer.id), eq(follows.targetId, targetKey)))
    .returning({ targetId: follows.targetId })
  if (!removed.length) await db.insert(follows).values({ followerId: viewer.id, targetId: targetKey })
  return { ok: true }
}

export type EventState = Record<string, { going: number; mine: boolean }>

export async function getEventsState(): Promise<EventState> {
  const viewer = await getViewer()
  const ids = events.map((e) => `event:${e.id}`)
  const { totals, mine } = await reactionCounts(ids, viewer?.id)
  return Object.fromEntries(
    events.map((e) => {
      const id = `event:${e.id}`
      return [e.id, { going: e.attendees.length + (totals.get(id)?.asistir ?? 0), mine: mine.has(`${id}|asistir`) }]
    }),
  )
}
