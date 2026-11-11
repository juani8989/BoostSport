'use server'

import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { postAudioSrc, postImageSrc } from '@/lib/media'
import { db } from '@/lib/db'
import { comments, follows, postAudio, posts, reactions } from '@/lib/db/schema'
import { describeParties, getViewer, requireViewer, userKey, type Party } from '@/lib/viewer'
import { seedAthleteFromKey, seedDaily, type DailyKind } from '@/lib/catalog'
import { getSettings } from '@/lib/user-settings'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export type ViewerPost = {
  id: string
  author: Party
  following: boolean
  mine: boolean
  kind: DailyKind
  body: string
  image: string | null
  audio: { url: string; name: string } | null
  createdAt: string
  likes: number
  apoyos: number
  comments: number
  reposts: number
  views: number
  donations: number
  liked: boolean
  supported: boolean
  saved: boolean
  reposted: boolean
  donated: boolean
}

const POST_ID = /^(seed:d\d+|post:\d+)$/
const KEY = /^(user:[\w-]+|seed:at-[a-z]+)$/

/** Audio lives in its own table; until it's created posts simply have no audio. */
async function audioFor(ids: number[]) {
  if (!ids.length) return new Map<number, { url: string; name: string }>()
  try {
    // Only the names: the bytes are served by /api/media/audio.
    // Blob URLs come as they are; old data URLs stay in the database and are served by /api/media/audio.
    const rows = await db
      .select({ postId: postAudio.postId, audioName: postAudio.audioName, url: sql<string | null>`case when left(${postAudio.audioUrl}, 5) = 'data:' then null else ${postAudio.audioUrl} end` })
      .from(postAudio)
      .where(inArray(postAudio.postId, ids))
    return new Map(rows.map((r) => [r.postId, { url: r.url ?? postAudioSrc(r.postId), name: r.audioName }]))
  } catch {
    return new Map<number, { url: string; name: string }>()
  }
}

/** Every post of one profile, newest first, with counters and the viewer's own state. */
export async function getProfilePosts(profileKey: string): Promise<ViewerPost[]> {
  const viewer = await getViewer()
  const key = profileKey === 'me' && viewer ? viewer.key : profileKey
  if (!KEY.test(key)) return []

  type Base = { id: string; kind: DailyKind; body: string; image: string | null; createdAt: string; baseLikes: number; baseComments: number; audio: ViewerPost['audio'] }
  let base: Base[] = []
  const seed = seedAthleteFromKey(key)
  if (seed) {
    const now = Date.now()
    base = seedDaily
      .filter((d) => d.athleteId === seed.id)
      .map((d) => ({ id: d.id, kind: d.kind, body: d.body, image: d.image, createdAt: new Date(now - d.minutesAgo * 60_000).toISOString(), baseLikes: d.baseLikes, baseComments: d.baseComments.length, audio: null }))
  } else {
    const userId = key.slice(5)
    const [settings, allRows] = await Promise.all([getSettings(userId), db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt)).limit(60)])
    const isMe = viewer?.id === userId
    if (!isMe && viewer && settings.blocked.includes(viewer.key)) return []
    const archived = new Set(isMe ? [] : settings.archived)
    const rows = allRows.filter((p) => !archived.has(`post:${p.id}`))
    base = rows.map((p) => ({ id: `post:${p.id}`, kind: p.kind as DailyKind, body: p.body, image: postImageSrc(p.id, p.mediaUrl), createdAt: p.createdAt.toISOString(), baseLikes: 0, baseComments: 0, audio: null }))
  }
  if (!base.length) return []

  const ids = base.map((b) => b.id)
  const realIds = ids.filter((id) => id.startsWith('post:')).map((id) => Number(id.slice(5)))
  const [parties, totalsRows, commentRows, mineRows, followRow, audio] = await Promise.all([
    describeParties([key]),
    db.select({ t: reactions.targetId, kind: reactions.kind, n: count() }).from(reactions).where(inArray(reactions.targetId, ids)).groupBy(reactions.targetId, reactions.kind),
    db.select({ t: comments.targetId, n: count() }).from(comments).where(inArray(comments.targetId, ids)).groupBy(comments.targetId),
    viewer ? db.select({ t: reactions.targetId, kind: reactions.kind }).from(reactions).where(and(eq(reactions.userId, viewer.id), inArray(reactions.targetId, ids))) : Promise.resolve([]),
    viewer ? db.select({ t: follows.targetId }).from(follows).where(and(eq(follows.followerId, viewer.id), eq(follows.targetId, key))).limit(1) : Promise.resolve([]),
    audioFor(realIds),
  ])
  const author = parties.get(key)
  if (!author) return []

  const totals = new Map<string, Record<string, number>>()
  for (const r of totalsRows) totals.set(r.t, { ...(totals.get(r.t) ?? {}), [r.kind]: Number(r.n) })
  const commentsBy = new Map(commentRows.map((r) => [r.t, Number(r.n)]))
  const mine = new Set(mineRows.map((r) => `${r.t}|${r.kind}`))

  return base.map((b) => {
    const t = totals.get(b.id) ?? {}
    return {
      id: b.id,
      author,
      following: followRow.length > 0,
      mine: viewer?.key === key,
      kind: b.kind,
      body: b.body,
      image: b.image,
      audio: b.id.startsWith('post:') ? (audio.get(Number(b.id.slice(5))) ?? null) : null,
      createdAt: b.createdAt,
      likes: b.baseLikes + (t.like ?? 0),
      apoyos: Math.round(b.baseLikes / 6) + (t.apoyo ?? 0),
      comments: b.baseComments + (commentsBy.get(b.id) ?? 0),
      reposts: Math.round(b.baseLikes / 20) + (t.repost ?? 0),
      // Seed posts start with an estimate so the demo doesn't look empty.
      views: b.baseLikes * 9 + (t.view ?? 0),
      donations: t.donar ?? 0,
      liked: mine.has(`${b.id}|like`),
      supported: mine.has(`${b.id}|apoyo`),
      saved: mine.has(`${b.id}|guardado`),
      reposted: mine.has(`${b.id}|repost`),
      donated: mine.has(`${b.id}|donar`),
    }
  })
}

/** Counts one view per person per post. Guests aren't counted. */
export async function recordView(postId: string): Promise<void> {
  const viewer = await getViewer()
  if (!viewer || !POST_ID.test(postId)) return
  await db.insert(reactions).values({ targetId: postId, userId: viewer.id, kind: 'view' }).onConflictDoNothing()
}

export type Reactor = Party & { at: string; following: boolean; isMe: boolean }

/** Who liked, supported, reposted or viewed a post. Seed reactions are only a number, so they aren't listed. */
export async function getReactors(postId: string, kind: 'like' | 'apoyo' | 'repost' | 'view'): Promise<Reactor[]> {
  const viewer = await getViewer()
  if (!POST_ID.test(postId)) return []
  const rows = await db
    .select({ userId: reactions.userId, createdAt: reactions.createdAt })
    .from(reactions)
    .where(and(eq(reactions.targetId, postId), eq(reactions.kind, kind)))
    .orderBy(desc(reactions.createdAt))
    .limit(200)
  const keys = rows.map((r) => userKey(r.userId))
  const [parties, followingRows] = await Promise.all([
    describeParties(keys),
    viewer && keys.length ? db.select({ t: follows.targetId }).from(follows).where(and(eq(follows.followerId, viewer.id), inArray(follows.targetId, keys))) : Promise.resolve([]),
  ])
  const following = new Set(followingRows.map((f) => f.t))
  return rows.flatMap((r) => {
    const p = parties.get(userKey(r.userId))
    return p ? [{ ...p, at: r.createdAt.toISOString(), following: following.has(p.key), isMe: p.key === viewer?.key }] : []
  })
}

/** Leaves a donation intent until payments go live. One per person per post. */
export async function pledgeDonation(postId: string, amount: number): Promise<Result> {
  const viewer = await requireViewer()
  if (!POST_ID.test(postId)) return { ok: false, error: 'Publicación inválida.' }
  if (!Number.isFinite(amount) || amount < 100 || amount > 10_000_000) return { ok: false, error: 'Elegí un monto válido.' }
  await db.insert(reactions).values({ targetId: postId, userId: viewer.id, kind: 'donar' }).onConflictDoNothing()
  return { ok: true }
}

export async function hasAudioTable(): Promise<boolean> {
  try {
    await db.select({ id: postAudio.postId }).from(postAudio).limit(1)
    return true
  } catch {
    return false
  }
}

