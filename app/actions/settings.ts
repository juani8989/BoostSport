'use server'

import { and, count, desc, eq, gte, inArray, or } from 'drizzle-orm'
import { postImageSrc } from '@/lib/media'
import { db } from '@/lib/db'
import { comments, follows, matches, messages, posts, profiles, reactions, session, swipes, user } from '@/lib/db/schema'
import { describeParties, requireViewer, type Party } from '@/lib/viewer'
import { events, seedAthleteKey, seedDaily } from '@/lib/catalog'
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '@/lib/settings'
import { SettingsUnavailableError, getSettings, saveSettings } from '@/lib/user-settings'
import { completenessOf, profileChecklist } from '@/lib/profile-checklist'
import { purgeUser } from '@/lib/purge-user'
import { getSession } from '@/lib/session'
import type { OfferMeta } from '@/app/actions/match'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export type SettingsAccount = {
  key: string
  role: 'deportista' | 'empresa' | 'evento'
  name: string
  email: string
  emailVerified: boolean
  identityVerified: boolean
  createdAt: string
  party: Party
  completeness: number
  missing: string[]
}

export async function getMySettings(): Promise<{ settings: Settings; account: SettingsAccount }> {
  const viewer = await requireViewer()
  const [settings, [row], parties] = await Promise.all([
    getSettings(viewer.id),
    db.select({ email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt }).from(user).where(eq(user.id, viewer.id)).limit(1),
    describeParties([viewer.key]),
  ])
  const checklist = profileChecklist(viewer.profile)
  return {
    settings,
    account: {
      key: viewer.key,
      role: viewer.role,
      name: viewer.name,
      email: row?.email ?? '',
      emailVerified: !!row?.emailVerified,
      identityVerified: viewer.profile.kind === 'deportista' ? viewer.profile.identityVerified : false,
      createdAt: (row?.createdAt ?? new Date()).toISOString(),
      party: parties.get(viewer.key) ?? { key: viewer.key, name: viewer.name, role: viewer.role, subtitle: '', initials: viewer.name.slice(0, 2).toUpperCase() },
      completeness: completenessOf(checklist),
      missing: checklist.filter((i) => !i.done).map((i) => i.action),
    },
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] }

export async function updateMySettings(patch: DeepPartial<Settings>): Promise<Result<{ settings: Settings }>> {
  const viewer = await requireViewer()
  const current = await getSettings(viewer.id)
  const next = mergeSettings(current, patch)
  next.interactions.hiddenWords = [...new Set(next.interactions.hiddenWords.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0 && w.length <= 40))].slice(0, 100)
  next.feed.interests = [...new Set(next.feed.interests)].slice(0, 30)
  next.app.timeLimitMinutes = Math.max(0, Math.min(600, Math.round(next.app.timeLimitMinutes)))
  try {
    await saveSettings(viewer.id, next)
  } catch (error) {
    if (error instanceof SettingsUnavailableError) return { ok: false, error: error.message }
    throw error
  }
  return { ok: true, settings: next }
}

type ListName = 'blocked' | 'muted' | 'restricted' | 'archived'
const LIST_KEY = { blocked: /^(user:[\w-]+|seed:(at|co)-[a-z]+)$/, muted: /^(user:[\w-]+|seed:(at|co)-[a-z]+)$/, restricted: /^(user:[\w-]+|seed:(at|co)-[a-z]+)$/, archived: /^post:\d+$/ }

export async function setListMember(list: ListName, key: string, on: boolean): Promise<Result> {
  const viewer = await requireViewer()
  if (!(list in LIST_KEY) || typeof key !== 'string' || !LIST_KEY[list].test(key) || key === viewer.key) return { ok: false, error: 'Acción inválida.' }
  if (list === 'archived') {
    const [own] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, Number(key.slice(5))), eq(posts.userId, viewer.id))).limit(1)
    if (!own) return { ok: false, error: 'Solo podés archivar tus publicaciones.' }
  }
  const current = await getSettings(viewer.id)
  const set = new Set(current[list])
  if (on) set.add(key)
  else set.delete(key)
  const next = { ...current, [list]: [...set] }
  // Blocking also stops following in both directions.
  if (list === 'blocked' && on && key.startsWith('user:')) {
    await db.delete(follows).where(or(and(eq(follows.followerId, viewer.id), eq(follows.targetId, key)), and(eq(follows.followerId, key.slice(5)), eq(follows.targetId, viewer.key))))
  }
  await saveSettings(viewer.id, next)
  return { ok: true }
}

export async function getPeople(keys: string[]): Promise<Party[]> {
  await requireViewer()
  const valid = keys.filter((k) => typeof k === 'string' && /^(user:[\w-]+|seed:(at|co)-[a-z]+)$/.test(k)).slice(0, 200)
  const parties = await describeParties(valid)
  return valid.map((k) => parties.get(k)).filter((p): p is Party => !!p)
}

/** People the viewer can block, mute or restrict: who they follow, who follows them and who they chatted with. */
export async function getKnownPeople(): Promise<Party[]> {
  const viewer = await requireViewer()
  const [following, followers, myMatches] = await Promise.all([
    db.select({ k: follows.targetId }).from(follows).where(eq(follows.followerId, viewer.id)),
    db.select({ k: follows.followerId }).from(follows).where(eq(follows.targetId, viewer.key)),
    db.select({ a: matches.athleteKey, o: matches.orgKey }).from(matches).where(or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key))),
  ])
  const keys = new Set<string>([...following.map((f) => f.k), ...followers.map((f) => `user:${f.k}`), ...myMatches.map((m) => (m.a === viewer.key ? m.o : m.a))])
  keys.delete(viewer.key)
  const parties = await describeParties([...keys])
  return [...parties.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export type TargetPreview = { targetId: string; title: string; subtitle: string; image?: string; kind: 'publicacion' | 'evento' | 'deportista'; at: string; authorKey?: string }

async function describeTargets(rows: { targetId: string; createdAt: Date }[]): Promise<TargetPreview[]> {
  const postIds = rows.map((r) => r.targetId).filter((t) => t.startsWith('post:')).map((t) => Number(t.slice(5)))
  const athleteKeys = rows.map((r) => r.targetId).filter((t) => t.startsWith('athlete:')).map((t) => t.slice(8))
  const realPosts = postIds.length ? await db.select().from(posts).where(inArray(posts.id, postIds)) : []
  const postBy = new Map(realPosts.map((p) => [`post:${p.id}`, p]))
  const parties = await describeParties([...athleteKeys, ...realPosts.map((p) => `user:${p.userId}`), ...seedDaily.map((s) => seedAthleteKey(s.athleteId))])

  const out: TargetPreview[] = []
  for (const { targetId, createdAt } of rows) {
    const at = createdAt.toISOString()
    const real = postBy.get(targetId)
    if (real) {
      const author = parties.get(`user:${real.userId}`)
      out.push({ targetId, title: real.body, subtitle: author?.name ?? real.authorName, image: postImageSrc(real.id, real.mediaUrl) ?? undefined, kind: 'publicacion', at, authorKey: author?.key })
      continue
    }
    const seed = seedDaily.find((s) => s.id === targetId)
    if (seed) {
      const author = parties.get(seedAthleteKey(seed.athleteId))
      out.push({ targetId, title: seed.body, subtitle: author?.name ?? 'Deportista', image: seed.image, kind: 'publicacion', at, authorKey: author?.key })
      continue
    }
    if (targetId.startsWith('event:')) {
      const ev = events.find((e) => `event:${e.id}` === targetId)
      if (ev) out.push({ targetId, title: ev.name, subtitle: `${ev.kind} · ${ev.date} · ${ev.place}`, image: ev.image, kind: 'evento', at })
      continue
    }
    if (targetId.startsWith('athlete:')) {
      const p = parties.get(targetId.slice(8))
      if (p) out.push({ targetId, title: p.name, subtitle: p.subtitle, image: p.image, kind: 'deportista', at, authorKey: p.key })
    }
  }
  return out
}

export async function getSaved(): Promise<TargetPreview[]> {
  const viewer = await requireViewer()
  const rows = await db
    .select({ targetId: reactions.targetId, createdAt: reactions.createdAt })
    .from(reactions)
    .where(and(eq(reactions.userId, viewer.id), eq(reactions.kind, 'guardado')))
    .orderBy(desc(reactions.createdAt))
    .limit(200)
  return describeTargets(rows)
}

export type OwnPost = { id: string; body: string; image: string | null; kind: string; createdAt: string; archived: boolean; likes: number; comments: number }

export async function getMyPosts(): Promise<OwnPost[]> {
  const viewer = await requireViewer()
  const [rows, settings] = await Promise.all([
    db.select().from(posts).where(eq(posts.userId, viewer.id)).orderBy(desc(posts.createdAt)).limit(200),
    getSettings(viewer.id),
  ])
  const ids = rows.map((p) => `post:${p.id}`)
  const [likeRows, commentRows] = ids.length
    ? await Promise.all([
        db.select({ t: reactions.targetId, n: count() }).from(reactions).where(and(inArray(reactions.targetId, ids), eq(reactions.kind, 'like'))).groupBy(reactions.targetId),
        db.select({ t: comments.targetId, n: count() }).from(comments).where(inArray(comments.targetId, ids)).groupBy(comments.targetId),
      ])
    : [[], []]
  const likes = new Map(likeRows.map((r) => [r.t, Number(r.n)]))
  const comm = new Map(commentRows.map((r) => [r.t, Number(r.n)]))
  const archived = new Set(settings.archived)
  return rows.map((p) => {
    const id = `post:${p.id}`
    return { id, body: p.body, image: postImageSrc(p.id, p.mediaUrl), kind: p.kind, createdAt: p.createdAt.toISOString(), archived: archived.has(id), likes: likes.get(id) ?? 0, comments: comm.get(id) ?? 0 }
  })
}

export type Activity = {
  likes: TargetPreview[]
  apoyos: TargetPreview[]
  events: TargetPreview[]
  comments: { id: number; body: string; createdAt: string; target: TargetPreview | null }[]
  following: (Party & { since: string })[]
  swipes: { liked: number; passed: number }
  history: { label: string; at: string }[]
}

export async function getMyActivity(): Promise<Activity> {
  const viewer = await requireViewer()
  const [reactionRows, commentRows, followRows, swipeRows, [account], postRows, matchRows] = await Promise.all([
    db.select().from(reactions).where(and(eq(reactions.userId, viewer.id), inArray(reactions.kind, ['like', 'apoyo', 'asistir']))).orderBy(desc(reactions.createdAt)).limit(300),
    db.select().from(comments).where(eq(comments.userId, viewer.id)).orderBy(desc(comments.createdAt)).limit(100),
    db.select().from(follows).where(eq(follows.followerId, viewer.id)).orderBy(desc(follows.createdAt)).limit(200),
    db.select({ liked: swipes.liked, n: count() }).from(swipes).where(eq(swipes.userId, viewer.id)).groupBy(swipes.liked),
    db.select({ createdAt: user.createdAt, updatedAt: user.updatedAt }).from(user).where(eq(user.id, viewer.id)).limit(1),
    db.select({ id: posts.id, createdAt: posts.createdAt }).from(posts).where(eq(posts.userId, viewer.id)).orderBy(posts.createdAt).limit(1),
    db.select({ createdAt: matches.createdAt }).from(matches).where(or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key))).orderBy(matches.createdAt).limit(1),
  ])

  const previews = await describeTargets([
    ...reactionRows.map((r) => ({ targetId: r.targetId, createdAt: r.createdAt })),
    ...commentRows.map((c) => ({ targetId: c.targetId, createdAt: c.createdAt })),
  ])
  const byTarget = new Map(previews.map((p) => [p.targetId, p]))
  const pick = (kind: string) =>
    reactionRows.flatMap((r) => {
      const p = r.kind === kind ? byTarget.get(r.targetId) : undefined
      return p ? [{ ...p, at: r.createdAt.toISOString() }] : []
    })

  const parties = await describeParties(followRows.map((f) => f.targetId))
  const history = [
    account ? { label: 'Creaste tu cuenta', at: account.createdAt.toISOString() } : null,
    postRows[0] ? { label: 'Hiciste tu primera publicación', at: postRows[0].createdAt.toISOString() } : null,
    matchRows[0] ? { label: 'Hiciste tu primer match', at: matchRows[0].createdAt.toISOString() } : null,
    followRows.length ? { label: 'Empezaste a seguir a alguien por primera vez', at: followRows[followRows.length - 1].createdAt.toISOString() } : null,
    account ? { label: 'Última actualización de tu cuenta', at: account.updatedAt.toISOString() } : null,
  ].filter((h): h is { label: string; at: string } => !!h)

  return {
    likes: pick('like'),
    apoyos: pick('apoyo'),
    events: pick('asistir'),
    comments: commentRows.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), target: byTarget.get(c.targetId) ?? null })),
    following: followRows.map((f) => {
      const p = parties.get(f.targetId)
      return p ? { ...p, since: f.createdAt.toISOString() } : null
    }).filter((p): p is Party & { since: string } => !!p),
    swipes: {
      liked: Number(swipeRows.find((s) => s.liked)?.n ?? 0),
      passed: Number(swipeRows.find((s) => !s.liked)?.n ?? 0),
    },
    history: history.sort((a, b) => b.at.localeCompare(a.at)),
  }
}

export async function removeMyComment(id: number): Promise<Result> {
  const viewer = await requireViewer()
  if (!Number.isInteger(id)) return { ok: false, error: 'Comentario inválido.' }
  await db.delete(comments).where(and(eq(comments.id, id), eq(comments.userId, viewer.id)))
  return { ok: true }
}

export async function undoReaction(targetId: string, kind: 'like' | 'apoyo' | 'asistir' | 'guardado'): Promise<Result> {
  const viewer = await requireViewer()
  await db.delete(reactions).where(and(eq(reactions.userId, viewer.id), eq(reactions.targetId, String(targetId)), eq(reactions.kind, kind)))
  return { ok: true }
}

export async function unfollow(targetKey: string): Promise<Result> {
  const viewer = await requireViewer()
  await db.delete(follows).where(and(eq(follows.followerId, viewer.id), eq(follows.targetId, String(targetKey))))
  return { ok: true }
}

export type Stats = {
  followers: number
  following: number
  newFollowers7: number
  newFollowers30: number
  posts: number
  likes: number
  apoyos: number
  comments: number
  saves: number
  matches: number
  messagesSent: number
  messagesReceived: number
  offers: { sent: number; received: number; accepted: number; rejected: number; pending: number }
  interestShown: number
  interestReceived: number
  topPosts: { id: string; body: string; image: string | null; likes: number; comments: number }[]
  weekly: { label: string; followers: number; likes: number }[]
  completeness: number
}

export async function getMyStats(): Promise<Stats> {
  const viewer = await requireViewer()
  const key = viewer.key
  const since = (days: number) => new Date(Date.now() - days * 86_400_000)
  const myPosts = await db.select().from(posts).where(eq(posts.userId, viewer.id)).orderBy(desc(posts.createdAt)).limit(500)
  const ids = myPosts.map((p) => `post:${p.id}`)
  const targetIds = [...ids, `athlete:${key}`]

  const [followerRows, followingRow, reactionRows, commentRows, myMatches, swipesOut, swipesIn] = await Promise.all([
    db.select({ createdAt: follows.createdAt }).from(follows).where(eq(follows.targetId, key)),
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, viewer.id)),
    db.select({ t: reactions.targetId, kind: reactions.kind, createdAt: reactions.createdAt }).from(reactions).where(inArray(reactions.targetId, targetIds)),
    ids.length ? db.select({ t: comments.targetId, n: count() }).from(comments).where(inArray(comments.targetId, ids)).groupBy(comments.targetId) : Promise.resolve([]),
    db.select({ id: matches.id }).from(matches).where(or(eq(matches.athleteKey, key), eq(matches.orgKey, key))),
    db.select({ n: count() }).from(swipes).where(and(eq(swipes.userId, viewer.id), eq(swipes.liked, true))),
    db.select({ n: count() }).from(swipes).where(and(eq(swipes.targetId, key), eq(swipes.liked, true))),
  ])
  const matchIds = myMatches.map((m) => m.id)
  const threadRows = matchIds.length ? await db.select({ senderKey: messages.senderKey, kind: messages.kind, meta: messages.meta }).from(messages).where(inArray(messages.matchId, matchIds)) : []

  const offers = { sent: 0, received: 0, accepted: 0, rejected: 0, pending: 0 }
  let messagesSent = 0
  let messagesReceived = 0
  for (const m of threadRows) {
    if (m.kind === 'system') continue
    const mine = m.senderKey === key
    if (m.kind === 'offer') {
      if (mine) offers.sent++
      else offers.received++
      const status = (m.meta as OfferMeta | null)?.status
      if (status === 'aceptada') offers.accepted++
      else if (status === 'rechazada') offers.rejected++
      else offers.pending++
    } else if (mine) messagesSent++
    else messagesReceived++
  }

  const likesBy = new Map<string, number>()
  for (const r of reactionRows) if (r.kind === 'like') likesBy.set(r.t, (likesBy.get(r.t) ?? 0) + 1)
  const commentsBy = new Map(commentRows.map((r) => [r.t, Number(r.n)]))

  const weekly = Array.from({ length: 6 }, (_, i) => {
    const from = since((6 - i) * 7)
    const to = since((5 - i) * 7)
    const inRange = (d: Date) => d >= from && d < to
    return {
      label: from.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      followers: followerRows.filter((f) => inRange(f.createdAt)).length,
      likes: reactionRows.filter((r) => r.kind === 'like' && inRange(r.createdAt)).length,
    }
  })

  return {
    followers: followerRows.length,
    following: Number(followingRow[0]?.n ?? 0),
    newFollowers7: followerRows.filter((f) => f.createdAt >= since(7)).length,
    newFollowers30: followerRows.filter((f) => f.createdAt >= since(30)).length,
    posts: myPosts.length,
    likes: reactionRows.filter((r) => r.kind === 'like').length,
    apoyos: reactionRows.filter((r) => r.kind === 'apoyo').length,
    comments: [...commentsBy.values()].reduce((a, b) => a + b, 0),
    saves: reactionRows.filter((r) => r.kind === 'guardado').length,
    matches: matchIds.length,
    messagesSent,
    messagesReceived,
    offers,
    interestShown: Number(swipesOut[0]?.n ?? 0),
    interestReceived: Number(swipesIn[0]?.n ?? 0),
    topPosts: myPosts
      .map((p) => ({ id: `post:${p.id}`, body: p.body, image: postImageSrc(p.id, p.mediaUrl), likes: likesBy.get(`post:${p.id}`) ?? 0, comments: commentsBy.get(`post:${p.id}`) ?? 0 }))
      .sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
      .slice(0, 3),
    weekly,
    completeness: completenessOf(profileChecklist(viewer.profile)),
  }
}

export type Deal = { id: number; matchId: number; other: Party; type: string; items: string[]; amount: string; duration: string; status: string; mine: boolean; createdAt: string }

export async function getMyDeals(): Promise<Deal[]> {
  const viewer = await requireViewer()
  const myMatches = await db.select().from(matches).where(or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key)))
  if (!myMatches.length) return []
  const otherOf = new Map(myMatches.map((m) => [m.id, m.athleteKey === viewer.key ? m.orgKey : m.athleteKey]))
  const rows = await db
    .select()
    .from(messages)
    .where(and(inArray(messages.matchId, [...otherOf.keys()]), eq(messages.kind, 'offer')))
    .orderBy(desc(messages.createdAt))
  const parties = await describeParties([...otherOf.values()])
  return rows.flatMap((m) => {
    const meta = m.meta as OfferMeta | null
    const other = parties.get(otherOf.get(m.matchId) ?? '')
    if (!meta || !other) return []
    return [{ id: m.id, matchId: m.matchId, other, type: meta.type, items: meta.items ?? [], amount: meta.amount ?? '', duration: meta.duration ?? '', status: meta.status, mine: m.senderKey === viewer.key, createdAt: m.createdAt.toISOString() }]
  })
}

export type DeviceSession = { id: string; current: boolean; userAgent: string; ipAddress: string; createdAt: string; updatedAt: string; expiresAt: string }

export async function getMySessions(): Promise<DeviceSession[]> {
  const viewer = await requireViewer()
  const currentId = (await getSession())?.session.id
  const rows = await db.select().from(session).where(and(eq(session.userId, viewer.id), gte(session.expiresAt, new Date()))).orderBy(desc(session.updatedAt))
  return rows.map((s) => ({
    id: s.id,
    current: s.id === currentId,
    userAgent: s.userAgent ?? '',
    ipAddress: s.ipAddress ?? '',
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
  }))
}

export async function closeSession(id: string): Promise<Result> {
  const viewer = await requireViewer()
  await db.delete(session).where(and(eq(session.userId, viewer.id), eq(session.id, String(id))))
  return { ok: true }
}

/** A copy of everything BoostSport stores about the viewer, as JSON. */
export async function exportMyData(): Promise<Result<{ json: string }>> {
  const viewer = await requireViewer()
  const key = viewer.key
  const [[account], [profile], myPosts, myComments, myReactions, following, followers, mySwipes, myMatches, settings] = await Promise.all([
    db.select({ name: user.name, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt }).from(user).where(eq(user.id, viewer.id)),
    db.select({ role: profiles.role, data: profiles.data, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt }).from(profiles).where(eq(profiles.userId, viewer.id)),
    db.select().from(posts).where(eq(posts.userId, viewer.id)),
    db.select().from(comments).where(eq(comments.userId, viewer.id)),
    db.select().from(reactions).where(eq(reactions.userId, viewer.id)),
    db.select().from(follows).where(eq(follows.followerId, viewer.id)),
    db.select({ followerId: follows.followerId, createdAt: follows.createdAt }).from(follows).where(eq(follows.targetId, key)),
    db.select().from(swipes).where(eq(swipes.userId, viewer.id)),
    db.select().from(matches).where(or(eq(matches.athleteKey, key), eq(matches.orgKey, key))),
    getSettings(viewer.id),
  ])
  const myMessages = myMatches.length ? await db.select().from(messages).where(inArray(messages.matchId, myMatches.map((m) => m.id))) : []
  const data = {
    exportadoEl: new Date().toISOString(),
    cuenta: account,
    perfil: profile,
    configuracion: settings,
    publicaciones: myPosts,
    comentarios: myComments,
    reacciones: myReactions,
    seguidos: following,
    seguidores: followers.length,
    interesEnMatch: mySwipes,
    matches: myMatches,
    mensajes: myMessages,
  }
  return { ok: true, json: JSON.stringify(data, null, 2) }
}

export async function deleteMyAccount(confirmation: string): Promise<Result> {
  const viewer = await requireViewer()
  if (confirmation !== 'ELIMINAR') return { ok: false, error: 'Escribí ELIMINAR para confirmar.' }
  await purgeUser(viewer.id)
  return { ok: true }
}

export async function resetMySettings(section: keyof Settings): Promise<Result<{ settings: Settings }>> {
  const viewer = await requireViewer()
  const current = await getSettings(viewer.id)
  if (!(section in DEFAULT_SETTINGS)) return { ok: false, error: 'Sección inválida.' }
  const next = { ...current, [section]: DEFAULT_SETTINGS[section] }
  await saveSettings(viewer.id, next)
  return { ok: true, settings: next }
}
