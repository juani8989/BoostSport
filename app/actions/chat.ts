'use server'

import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { follows, matches, messages } from '@/lib/db/schema'
import { describeParties, requireViewer, type Party, type ServerViewer } from '@/lib/viewer'
import { getSettings, getSettingsMap, idFromKey } from '@/lib/user-settings'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export type Contact = {
  party: Party
  /** The conversation you already have with this person, if any. */
  matchId: number | null
  /** Why you can't start a chat with them; null when you can. */
  blockedReason: string | null
}

export type MessageHit = {
  matchId: number
  messageId: number
  other: Party
  body: string
  mine: boolean
  createdAt: string
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const KEY_RE = /^(user:[\w-]+|seed:(at|co)-[a-z]+)$/

/** People you follow or who follow you: the ones you can open a chat with from "Nuevo mensaje". */
async function knownKeys(viewer: ServerViewer) {
  const [following, followers] = await Promise.all([
    db.select({ k: follows.targetId }).from(follows).where(eq(follows.followerId, viewer.id)),
    db.select({ k: follows.followerId }).from(follows).where(eq(follows.targetId, viewer.key)),
  ])
  const followedBack = new Set(followers.map((f) => `user:${f.k}`))
  const keys = new Set<string>([...following.map((f) => f.k), ...followedBack])
  keys.delete(viewer.key)
  return { keys: [...keys].filter((k) => KEY_RE.test(k)), followedBack }
}

/** Finds the conversation between two people, whichever column each one is in. */
async function findConversation(a: string, b: string) {
  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(or(and(eq(matches.athleteKey, a), eq(matches.orgKey, b)), and(eq(matches.athleteKey, b), eq(matches.orgKey, a))))
    .limit(1)
  return row?.id ?? null
}

/** Whether a person accepts a new chat from the viewer, judged by their privacy settings. */
function reasonFor(otherKey: string, viewerKey: string, settings: Awaited<ReturnType<typeof getSettings>> | undefined, theyFollowYou: boolean, mineBlocked: string[]) {
  if (mineBlocked.includes(otherKey)) return 'Bloqueaste a esta persona.'
  if (!settings) return null
  if (settings.blocked.includes(viewerKey)) return 'No podés escribirle a esta persona.'
  if (settings.interactions.messages === 'nadie') return 'No recibe mensajes por ahora.'
  if (settings.interactions.messages === 'seguidos' && !theyFollowYou) return 'Solo recibe mensajes de quienes sigue.'
  return null
}

export async function getContacts(): Promise<Contact[]> {
  const viewer = await requireViewer()
  const { keys, followedBack } = await knownKeys(viewer)
  if (!keys.length) return []

  const realIds = keys.map(idFromKey).filter((id): id is string => !!id)
  const [parties, settingsBy, mine, convos] = await Promise.all([
    describeParties(keys),
    getSettingsMap(realIds),
    getSettings(viewer.id),
    db
      .select({ id: matches.id, a: matches.athleteKey, o: matches.orgKey })
      .from(matches)
      .where(or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key))),
  ])
  const convoWith = new Map(convos.map((c) => [c.a === viewer.key ? c.o : c.a, c.id]))

  const contacts: Contact[] = []
  for (const key of keys) {
    const party = parties.get(key)
    if (!party) continue
    const id = idFromKey(key)
    const settings = id ? settingsBy.get(id) : undefined
    // People who blocked you don't show up at all.
    if (settings?.blocked.includes(viewer.key)) continue
    contacts.push({
      party,
      matchId: convoWith.get(key) ?? null,
      blockedReason: reasonFor(key, viewer.key, settings, followedBack.has(key), mine.blocked),
    })
  }
  return contacts.sort((a, b) => a.party.name.localeCompare(b.party.name))
}

/** Opens (or reuses) a chat with someone you follow or who follows you. */
export async function startChat(targetKey: string): Promise<Result<{ matchId: number }>> {
  const viewer = await requireViewer()
  if (typeof targetKey !== 'string' || !KEY_RE.test(targetKey) || targetKey === viewer.key) return { ok: false, error: 'Perfil inválido.' }

  const existing = await findConversation(viewer.key, targetKey)
  if (existing) return { ok: true, matchId: existing }

  const { keys, followedBack } = await knownKeys(viewer)
  if (!keys.includes(targetKey)) return { ok: false, error: 'Solo podés escribirle a gente que seguís o que te sigue.' }

  const otherId = idFromKey(targetKey)
  const [theirs, mine, parties] = await Promise.all([otherId ? getSettings(otherId) : undefined, getSettings(viewer.id), describeParties([targetKey])])
  const reason = reasonFor(targetKey, viewer.key, theirs, followedBack.has(targetKey), mine.blocked)
  if (reason) return { ok: false, error: reason }
  const other = parties.get(targetKey)
  if (!other) return { ok: false, error: 'Perfil inválido.' }

  // Deportista ↔ marca or institución keeps the usual columns (deals and sponsors read them).
  // Between two people of the same kind, the order is fixed so the pair stays unique.
  const [athleteKey, orgKey] =
    viewer.role === 'deportista' && other.role !== 'deportista'
      ? [viewer.key, targetKey]
      : other.role === 'deportista' && viewer.role !== 'deportista'
        ? [targetKey, viewer.key]
        : [viewer.key, targetKey].sort()

  const [created] = await db.insert(matches).values({ athleteKey, orgKey }).onConflictDoNothing().returning({ id: matches.id })
  if (created) return { ok: true, matchId: created.id }
  const again = await findConversation(viewer.key, targetKey)
  return again ? { ok: true, matchId: again } : { ok: false, error: 'No pudimos abrir el chat. Probá de nuevo.' }
}

/** Finds text in your conversations. Up to 40 messages, newest first. */
export async function searchMessages(query: string): Promise<MessageHit[]> {
  const viewer = await requireViewer()
  const q = typeof query === 'string' ? query.trim().slice(0, 80) : ''
  if (q.length < 2) return []

  const convos = await db
    .select({ id: matches.id, a: matches.athleteKey, o: matches.orgKey })
    .from(matches)
    .where(or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key)))
  if (!convos.length) return []
  const otherOf = new Map(convos.map((c) => [c.id, c.a === viewer.key ? c.o : c.a]))

  // Compared without accents or capitals ("organizacion" finds "Organización"), so the match
  // runs here over your most recent messages rather than in the database.
  const needle = normalize(q)
  const recent = await db
    .select({ id: messages.id, matchId: messages.matchId, senderKey: messages.senderKey, body: messages.body, createdAt: messages.createdAt })
    .from(messages)
    .where(and(inArray(messages.matchId, [...otherOf.keys()]), eq(messages.kind, 'text')))
    .orderBy(desc(messages.createdAt))
    .limit(3000)
  const rows = recent.filter((r) => normalize(r.body).includes(needle)).slice(0, 40)
  if (!rows.length) return []

  const parties = await describeParties([...new Set(rows.map((r) => otherOf.get(r.matchId)!))])
  return rows.flatMap((r) => {
    const other = parties.get(otherOf.get(r.matchId)!)
    return other ? [{ matchId: r.matchId, messageId: r.id, other, body: r.body, mine: r.senderKey === viewer.key, createdAt: r.createdAt.toISOString() }] : []
  })
}
