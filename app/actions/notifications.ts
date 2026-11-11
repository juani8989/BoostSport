'use server'

import { and, desc, eq, gte, inArray, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { comments, follows, matches, messages, posts, reactions, swipes } from '@/lib/db/schema'
import { describeParties, requireViewer, userKey, type Party } from '@/lib/viewer'
import { postImageSrc } from '@/lib/media'
import { getSettings, saveSettings } from '@/lib/user-settings'
import type { NotificationKey } from '@/lib/settings'
import type { OfferMeta } from '@/app/actions/match'

export type NotificationType = 'like' | 'apoyo' | 'repost' | 'donar' | 'comentario' | 'seguidor' | 'apoyo-perfil' | 'interes' | 'match' | 'mensaje' | 'propuesta' | 'propuesta-aceptada' | 'propuesta-rechazada'

export type NotificationTarget = { kind: 'post'; postId: string; ownerKey: string } | { kind: 'profile'; key: string } | { kind: 'chat'; matchId: number }

export type AppNotification = {
  id: string
  type: NotificationType
  actor: Party
  /** Other people who did the same thing (likes on one post are grouped). */
  others: number
  text: string
  preview?: string
  image?: string
  at: string
  unread: boolean
  target: NotificationTarget
  /** For new followers: whether the viewer already follows them back. */
  followsBack?: boolean
}

const SETTING: Record<NotificationType, NotificationKey> = {
  like: 'likes',
  apoyo: 'likes',
  repost: 'likes',
  donar: 'likes',
  'apoyo-perfil': 'likes',
  comentario: 'comentarios',
  seguidor: 'seguidores',
  interes: 'matches',
  match: 'matches',
  mensaje: 'mensajes',
  propuesta: 'propuestas',
  'propuesta-aceptada': 'propuestas',
  'propuesta-rechazada': 'propuestas',
}

const DAYS = 60
const PER_SOURCE = 60

/**
 * Real activity around the viewer, newest first: reactions and comments on their posts,
 * new followers, support, interest in Match, matches, messages and proposals.
 */
export async function getMyNotifications(): Promise<{ items: AppNotification[]; unread: number; paused: boolean }> {
  const viewer = await requireViewer()
  const key = viewer.key
  const since = new Date(Date.now() - DAYS * 86_400_000)

  const [settings, myPosts, myMatches] = await Promise.all([
    getSettings(viewer.id),
    db.select({ id: posts.id, body: posts.body, mediaUrl: posts.mediaUrl }).from(posts).where(eq(posts.userId, viewer.id)).orderBy(desc(posts.createdAt)).limit(200),
    db.select().from(matches).where(or(eq(matches.athleteKey, key), eq(matches.orgKey, key))),
  ])
  const postIds = myPosts.map((p) => `post:${p.id}`)
  const postBy = new Map(myPosts.map((p) => [`post:${p.id}`, p]))
  const matchIds = myMatches.map((m) => m.id)
  const otherOf = new Map(myMatches.map((m) => [m.id, m.athleteKey === key ? m.orgKey : m.athleteKey]))

  const [reactionRows, commentRows, followerRows, interestRows, messageRows, followingRows] = await Promise.all([
    db
      .select()
      .from(reactions)
      .where(and(inArray(reactions.targetId, [...postIds, `athlete:${key}`]), ne(reactions.userId, viewer.id), inArray(reactions.kind, ['like', 'apoyo', 'repost', 'donar']), gte(reactions.createdAt, since)))
      .orderBy(desc(reactions.createdAt))
      .limit(PER_SOURCE * 3),
    postIds.length
      ? db.select().from(comments).where(and(inArray(comments.targetId, postIds), ne(comments.userId, viewer.id), gte(comments.createdAt, since))).orderBy(desc(comments.createdAt)).limit(PER_SOURCE)
      : Promise.resolve([]),
    db.select().from(follows).where(and(eq(follows.targetId, key), gte(follows.createdAt, since))).orderBy(desc(follows.createdAt)).limit(PER_SOURCE),
    db.select().from(swipes).where(and(eq(swipes.targetId, key), eq(swipes.liked, true), gte(swipes.createdAt, since))).orderBy(desc(swipes.createdAt)).limit(PER_SOURCE),
    matchIds.length
      ? db.select().from(messages).where(and(inArray(messages.matchId, matchIds), gte(messages.createdAt, since))).orderBy(desc(messages.createdAt)).limit(PER_SOURCE * 2)
      : Promise.resolve([]),
    db.select({ t: follows.targetId }).from(follows).where(eq(follows.followerId, viewer.id)),
  ])

  const actorKeys = [
    ...reactionRows.map((r) => userKey(r.userId)),
    ...commentRows.map((c) => userKey(c.userId)),
    ...followerRows.map((f) => userKey(f.followerId)),
    ...interestRows.map((s) => userKey(s.userId)),
    ...messageRows.map((m) => (m.senderKey === key || m.senderKey === 'system' ? otherOf.get(m.matchId) ?? '' : m.senderKey)),
    ...myMatches.map((m) => otherOf.get(m.id) ?? ''),
  ].filter(Boolean)
  const parties = await describeParties(actorKeys)
  const following = new Set(followingRows.map((f) => f.t))
  const hidden = new Set([...settings.blocked, ...settings.muted])
  const readAt = settings.notifications.lastReadAt
  const items: AppNotification[] = []
  const add = (n: Omit<AppNotification, 'unread' | 'others'> & { others?: number }) => {
    if (hidden.has(n.actor.key) || !settings.notifications.push[SETTING[n.type]]) return
    items.push({ others: 0, ...n, unread: !readAt || n.at > readAt })
  }
  const postInfo = (postId: string) => {
    const p = postBy.get(postId)
    return { preview: p?.body.slice(0, 80), image: p ? postImageSrc(p.id, p.mediaUrl) ?? undefined : undefined }
  }

  // Reactions on the same post are grouped: "Ana y 3 más le dieron me gusta…".
  const grouped = new Map<string, typeof reactionRows>()
  for (const r of reactionRows) {
    const groupKey = `${r.kind}|${r.targetId}`
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), r])
  }
  for (const [groupKey, rows] of grouped) {
    const [kind, targetId] = groupKey.split('|')
    const visible = rows.filter((r) => parties.has(userKey(r.userId)))
    const first = visible[0]
    if (!first) continue
    const actor = parties.get(userKey(first.userId))!
    const others = new Set(visible.map((r) => r.userId)).size - 1
    if (targetId === `athlete:${key}`) {
      add({ id: `apoyo-perfil:${first.userId}:${first.createdAt.getTime()}`, type: 'apoyo-perfil', actor, others, text: others ? 'te apoyaron' : 'te apoyó', at: first.createdAt.toISOString(), target: { kind: 'profile', key: actor.key } })
      continue
    }
    const verb = {
      like: others ? 'les gustó tu publicación' : 'le gustó tu publicación',
      apoyo: others ? 'apoyaron tu publicación' : 'apoyó tu publicación',
      repost: others ? 'recompartieron tu publicación' : 'recompartió tu publicación',
      donar: others ? 'quieren donarte por tu publicación' : 'quiere donarte por tu publicación',
    }[kind as 'like' | 'apoyo' | 'repost' | 'donar']
    add({ id: `${kind}:${targetId}:${first.createdAt.getTime()}`, type: kind as NotificationType, actor, others, text: verb, at: first.createdAt.toISOString(), target: { kind: 'post', postId: targetId, ownerKey: key }, ...postInfo(targetId) })
  }

  for (const c of commentRows) {
    const actor = parties.get(userKey(c.userId))
    if (!actor) continue
    add({ id: `comentario:${c.id}`, type: 'comentario', actor, text: `comentó: “${c.body.slice(0, 80)}”`, at: c.createdAt.toISOString(), target: { kind: 'post', postId: c.targetId, ownerKey: key }, image: postInfo(c.targetId).image })
  }

  for (const f of followerRows) {
    const actor = parties.get(userKey(f.followerId))
    if (!actor) continue
    add({ id: `seguidor:${f.followerId}`, type: 'seguidor', actor, text: 'empezó a seguirte', at: f.createdAt.toISOString(), target: { kind: 'profile', key: actor.key }, followsBack: following.has(actor.key) })
  }

  for (const s of interestRows) {
    const actor = parties.get(userKey(s.userId))
    if (!actor) continue
    add({ id: `interes:${s.userId}`, type: 'interes', actor, text: s.pitch ? `mostró interés en vos: “${s.pitch.slice(0, 80)}”` : 'mostró interés en vos en Match', at: s.createdAt.toISOString(), target: { kind: 'profile', key: actor.key } })
  }

  for (const m of myMatches) {
    const actor = parties.get(otherOf.get(m.id) ?? '')
    if (!actor || m.createdAt < since) continue
    add({ id: `match:${m.id}`, type: 'match', actor, text: '¡Hicieron match! Ya pueden hablar.', at: m.createdAt.toISOString(), target: { kind: 'chat', matchId: m.id } })
  }

  // Messages: only the latest one per conversation.
  const seenChat = new Set<number>()
  for (const m of messageRows) {
    if (m.kind === 'system') continue
    const mine = m.senderKey === key
    const actor = parties.get(mine ? otherOf.get(m.matchId) ?? '' : m.senderKey)
    if (!actor) continue
    if (m.kind === 'offer') {
      const meta = m.meta as OfferMeta | null
      if (!mine) add({ id: `propuesta:${m.id}`, type: 'propuesta', actor, text: `te envió una propuesta de ${meta?.type?.toLowerCase() ?? 'sponsoreo'}${meta?.amount ? ` (${meta.amount})` : ''}`, at: m.createdAt.toISOString(), target: { kind: 'chat', matchId: m.matchId } })
      else if (meta?.status === 'aceptada' || meta?.status === 'rechazada')
        add({ id: `propuesta-${meta.status}:${m.id}`, type: meta.status === 'aceptada' ? 'propuesta-aceptada' : 'propuesta-rechazada', actor, text: meta.status === 'aceptada' ? 'aceptó tu propuesta 🎉' : 'rechazó tu propuesta', at: m.createdAt.toISOString(), target: { kind: 'chat', matchId: m.matchId } })
      continue
    }
    if (mine || seenChat.has(m.matchId)) continue
    seenChat.add(m.matchId)
    add({ id: `mensaje:${m.id}`, type: 'mensaje', actor, text: `te escribió: “${m.body.slice(0, 80)}”`, at: m.createdAt.toISOString(), target: { kind: 'chat', matchId: m.matchId } })
  }

  items.sort((a, b) => b.at.localeCompare(a.at))
  const list = items.slice(0, 80)
  return { items: list, unread: settings.notifications.pauseAll ? 0 : list.filter((n) => n.unread).length, paused: settings.notifications.pauseAll }
}

/** Marks everything up to now as read. */
export async function markNotificationsRead(): Promise<{ ok: true } | { ok: false; error: string }> {
  const viewer = await requireViewer()
  const current = await getSettings(viewer.id)
  try {
    await saveSettings(viewer.id, { ...current, notifications: { ...current.notifications, lastReadAt: new Date().toISOString() } })
  } catch {
    return { ok: false, error: 'No se pudo guardar.' }
  }
  return { ok: true }
}
