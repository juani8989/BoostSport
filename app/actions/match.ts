'use server'

import { and, asc, desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { matches, messages, profiles, swipes, user } from '@/lib/db/schema'
import { describeParties, requireViewer, partyFromProfile, userKey, type Party, type ServerViewer } from '@/lib/viewer'
import { MATCH_THRESHOLD, affinityScore, companies, companyFromKey, seedAthleteFromKey, seedAthleteKey, type Company } from '@/lib/catalog'
import { athletes } from '@/lib/data'
import { getSettings, getSettingsMap, idFromKey } from '@/lib/user-settings'

const seedAffinity = (id: string) => 74 + ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 22)
import type { AthleteProfile, OrgProfile } from '@/lib/profile-types'

export type OfferType = 'Producto' | 'Dinero' | 'Embajador' | 'Sponsoreo'
export type OfferStatus = 'pendiente' | 'aceptada' | 'rechazada'
export type OfferMeta = {
  type: OfferType
  items: string[]
  amount: string
  duration: string
  status: OfferStatus
  counterpart?: string[]
  rationale?: string
}

export type DeckCard = {
  key: string
  party: Party
  affinity: number
  appliedToYou: boolean
  company?: Company
  athlete?: { needs: string[]; goals: string; achievements: string; followers?: string }
}

export type MatchSummary = {
  id: number
  other: Party
  lastMessage: string
  lastAt: string
  dealStatus: OfferStatus | null
}

export type ThreadMessage = {
  id: number
  mine: boolean
  kind: 'text' | 'offer' | 'system'
  body: string
  meta: OfferMeta | null
  createdAt: string
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const OFFER_TYPES: OfferType[] = ['Producto', 'Dinero', 'Embajador']
const athleteNeeds = (p: AthleteProfile | OrgProfile) => (p.kind === 'deportista' ? p.needs ?? [] : [])

export async function getDeck(opts?: { recycle?: boolean }): Promise<DeckCard[]> {
  const viewer = await requireViewer()
  const swipeFilter = opts?.recycle ? and(eq(swipes.userId, viewer.id), eq(swipes.liked, true)) : eq(swipes.userId, viewer.id)
  const [mySwipes, likedMe] = await Promise.all([
    db.select({ targetId: swipes.targetId }).from(swipes).where(swipeFilter),
    db.select({ userId: swipes.userId }).from(swipes).where(and(eq(swipes.targetId, viewer.key), eq(swipes.liked, true))),
  ])
  const seen = new Set(mySwipes.map((s) => s.targetId))
  const appliedKeys = new Set(likedMe.map((s) => userKey(s.userId)))

  const wantRole = viewer.role === 'deportista' ? ['empresa', 'evento'] : ['deportista']
  const realRows = await db
    .select({ userId: profiles.userId, role: profiles.role, data: profiles.data, name: user.name })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(inArray(profiles.role, wantRole))
    .limit(50)

  // People who hid themselves from Match, and blocks in either direction, stay out of the deck.
  const settingsBy = await getSettingsMap([viewer.id, ...realRows.map((r) => r.userId)])
  const mine = settingsBy.get(viewer.id)
  const visibleRows = realRows.filter((r) => {
    const st = settingsBy.get(r.userId)
    return st?.privacy.showInMatch !== false && !st?.blocked.includes(viewer.key) && !mine?.blocked.includes(userKey(r.userId))
  })

  const cards: DeckCard[] = []
  if (viewer.role === 'deportista') {
    const needs = athleteNeeds(viewer.profile)
    const discipline = viewer.profile.kind === 'deportista' ? viewer.profile.discipline : ''
    for (const company of companies) {
      cards.push({
        key: company.key,
        party: { key: company.key, name: company.name, role: 'empresa', subtitle: company.industry, image: company.image, initials: company.initials },
        affinity: affinityScore({ discipline, needs }, company),
        appliedToYou: false,
        company,
      })
    }
    for (const row of visibleRows) {
      const key = userKey(row.userId)
      cards.push({ key, party: partyFromProfile(key, row.data as OrgProfile, row.name), affinity: 75, appliedToYou: appliedKeys.has(key) })
    }
  } else {
    for (const a of Object.values(athletes)) {
      const key = seedAthleteKey(a.id)
      cards.push({
        key,
        party: { key, name: a.name, role: 'deportista', subtitle: `${a.sport} · ${a.city}`, image: a.image, initials: a.name.slice(0, 2).toUpperCase() },
        affinity: seedAffinity(a.id),
        appliedToYou: false,
        athlete: { needs: ['Indumentaria', 'Viajes'], goals: `${a.category} · ${a.level}`, achievements: a.sponsoredBy ? `Patrocinado por ${a.sponsoredBy}` : 'Busca su primer sponsor', followers: a.followers },
      })
    }
    for (const row of visibleRows) {
      if (row.userId === viewer.id) continue
      const key = userKey(row.userId)
      const p = row.data as AthleteProfile
      cards.push({
        key,
        party: partyFromProfile(key, p, row.name),
        affinity: appliedKeys.has(key) ? 92 : 80,
        appliedToYou: appliedKeys.has(key),
        athlete: { needs: p.needs ?? [], goals: p.goals ?? '', achievements: p.achievements ?? '' },
      })
    }
  }

  return cards.filter((c) => !seen.has(c.key) && c.key !== viewer.key).sort((a, b) => Number(b.appliedToYou) - Number(a.appliedToYou) || b.affinity - a.affinity)
}

function buildSeedOffer(company: Company, needs: string[]): OfferMeta {
  const overlap = needs.filter((n) => company.offers.includes(n))
  const items = overlap.length ? overlap : company.offers.slice(0, 2)
  const type: OfferType = items.includes('Dinero') ? 'Dinero' : items.includes('Visibilidad') ? 'Embajador' : 'Producto'
  return { type, items, amount: type === 'Dinero' ? 'USD 300 / mes' : '', duration: '6 meses', status: 'pendiente' }
}

async function seedAutoMessages(matchId: number, viewer: ServerViewer, otherKey: string) {
  const company = companyFromKey(otherKey)
  if (company) {
    await db.insert(messages).values([
      { matchId, senderKey: company.key, kind: 'text', body: `¡Hola ${viewer.name.split(' ')[0]}! Nos encantó tu perfil. ${company.benefits[0]} es solo el comienzo.` },
      { matchId, senderKey: company.key, kind: 'offer', body: `Propuesta de ${company.name}`, meta: buildSeedOffer(company, athleteNeeds(viewer.profile)) },
    ])
    return
  }
  const athlete = seedAthleteFromKey(otherKey)
  if (athlete) {
    await db.insert(messages).values({ matchId, senderKey: otherKey, kind: 'text', body: `¡Gracias por el match! Mi objetivo ahora: ${athlete.category} ${athlete.level}. ¿Qué tienen en mente?` })
  }
}

export async function swipe(input: { targetKey: string; liked: boolean; pitch?: string; challengeId?: string }): Promise<Result<{ matched: boolean; matchId?: number }>> {
  const viewer = await requireViewer()
  const { targetKey, liked } = input
  if (typeof targetKey !== 'string' || !/^(user:[\w-]+|seed:(co|at)-[a-z]+)$/.test(targetKey) || targetKey === viewer.key) {
    return { ok: false, error: 'Perfil inválido.' }
  }
  const pitch = input.pitch?.trim().slice(0, 400) || null
  const challengeId = input.challengeId?.slice(0, 60) || null

  const company = companyFromKey(targetKey)
  const seedAthlete = seedAthleteFromKey(targetKey)
  if (viewer.role === 'deportista' && seedAthlete) return { ok: false, error: 'Perfil inválido.' }
  if (viewer.role !== 'deportista' && company) return { ok: false, error: 'Perfil inválido.' }

  await db
    .insert(swipes)
    .values({ userId: viewer.id, targetId: targetKey, liked: !!liked, pitch, challengeId })
    .onConflictDoUpdate({ target: [swipes.userId, swipes.targetId], set: { liked: !!liked, pitch, challengeId } })
  if (!liked) return { ok: true, matched: false }

  let reciprocal = false
  if (company) {
    const discipline = viewer.profile.kind === 'deportista' ? viewer.profile.discipline : ''
    const bonus = pitch || challengeId ? 12 : 0
    reciprocal = affinityScore({ discipline, needs: athleteNeeds(viewer.profile) }, company) + bonus >= MATCH_THRESHOLD
  } else if (seedAthlete) {
    reciprocal = seedAthlete.seekingSponsor || seedAffinity(seedAthlete.id) >= 78
  } else {
    const otherId = targetKey.slice(5)
    const [back] = await db
      .select({ liked: swipes.liked })
      .from(swipes)
      .where(and(eq(swipes.userId, otherId), eq(swipes.targetId, viewer.key), eq(swipes.liked, true)))
      .limit(1)
    reciprocal = !!back
  }
  if (!reciprocal) return { ok: true, matched: false }

  const athleteKey = viewer.role === 'deportista' ? viewer.key : targetKey
  const orgKey = viewer.role === 'deportista' ? targetKey : viewer.key
  const [created] = await db.insert(matches).values({ athleteKey, orgKey }).onConflictDoNothing().returning({ id: matches.id })
  if (created) {
    await db.insert(messages).values({ matchId: created.id, senderKey: 'system', kind: 'system', body: '¡Es un match! Ya pueden hablar y armar un acuerdo.' })
    if (pitch) await db.insert(messages).values({ matchId: created.id, senderKey: viewer.key, kind: 'text', body: pitch })
    await seedAutoMessages(created.id, viewer, targetKey)
    return { ok: true, matched: true, matchId: created.id }
  }
  const [existing] = await db.select({ id: matches.id }).from(matches).where(and(eq(matches.athleteKey, athleteKey), eq(matches.orgKey, orgKey))).limit(1)
  return { ok: true, matched: true, matchId: existing?.id }
}

export async function getMatches(): Promise<MatchSummary[]> {
  const viewer = await requireViewer()
  const rows = await db
    .select()
    .from(matches)
    .where(or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key)))
    .orderBy(desc(matches.createdAt))
  if (!rows.length) return []

  const ids = rows.map((r) => r.id)
  const [msgs, parties] = await Promise.all([
    db.select().from(messages).where(inArray(messages.matchId, ids)).orderBy(asc(messages.createdAt), asc(messages.id)),
    describeParties(rows.map((r) => (r.athleteKey === viewer.key ? r.orgKey : r.athleteKey))),
  ])

  return rows
    .map((r) => {
      const otherKey = r.athleteKey === viewer.key ? r.orgKey : r.athleteKey
      const other = parties.get(otherKey)
      if (!other) return null
      const thread = msgs.filter((m) => m.matchId === r.id)
      const last = thread.at(-1)
      const offers = thread.filter((m) => m.kind === 'offer').map((m) => (m.meta as OfferMeta).status)
      const dealStatus = offers.includes('aceptada') ? 'aceptada' : offers.at(-1) ?? null
      return {
        id: r.id,
        other,
        lastMessage: last ? (last.kind === 'offer' ? `Propuesta: ${(last.meta as OfferMeta).type}` : last.body) : '',
        lastAt: (last?.createdAt ?? r.createdAt).toISOString(),
        dealStatus,
      }
    })
    .filter((m): m is MatchSummary => m !== null)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

async function loadMatch(matchId: number, viewer: ServerViewer) {
  if (!Number.isInteger(matchId)) return null
  const [row] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), or(eq(matches.athleteKey, viewer.key), eq(matches.orgKey, viewer.key))))
    .limit(1)
  if (!row) return null
  return { ...row, otherKey: row.athleteKey === viewer.key ? row.orgKey : row.athleteKey }
}

export async function getThread(matchId: number): Promise<{ other: Party; messages: ThreadMessage[] } | null> {
  const viewer = await requireViewer()
  const match = await loadMatch(matchId, viewer)
  if (!match) return null
  const [rows, parties] = await Promise.all([
    db.select().from(messages).where(eq(messages.matchId, matchId)).orderBy(asc(messages.createdAt), asc(messages.id)),
    describeParties([match.otherKey]),
  ])
  const other = parties.get(match.otherKey)
  if (!other) return null
  return {
    other,
    messages: rows.map((m) => ({
      id: m.id,
      mine: m.senderKey === viewer.key,
      kind: m.kind as ThreadMessage['kind'],
      body: m.body,
      meta: (m.meta as OfferMeta | null) ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

const seedReplies = [
  '¡Genial! Lo hablamos con el equipo y te confirmamos.',
  'Nos sirve mucho. ¿Podés compartir tu calendario de competencias?',
  'Perfecto. Mientras tanto, seguí publicando: nos ayuda a armar la campaña.',
]

export async function sendMessage(matchId: number, body: string): Promise<Result> {
  const viewer = await requireViewer()
  const match = await loadMatch(matchId, viewer)
  const text = typeof body === 'string' ? body.trim() : ''
  if (!match) return { ok: false, error: 'Conversación no encontrada.' }
  if (!text || text.length > 1000) return { ok: false, error: 'El mensaje debe tener entre 1 y 1000 caracteres.' }
  const otherId = idFromKey(match.otherKey)
  if (otherId) {
    const [theirs, mine] = await Promise.all([getSettings(otherId), getSettings(viewer.id)])
    if (theirs.blocked.includes(viewer.key) || mine.blocked.includes(match.otherKey)) return { ok: false, error: 'No podés enviar mensajes en esta conversación.' }
    if (theirs.interactions.messages === 'nadie') return { ok: false, error: 'Esta persona no recibe mensajes por ahora.' }
  }

  await db.insert(messages).values({ matchId, senderKey: viewer.key, kind: 'text', body: text })
  if (match.otherKey.startsWith('seed:')) {
    const reply = seedReplies[Math.floor(Math.random() * seedReplies.length)]
    await db.insert(messages).values({ matchId, senderKey: match.otherKey, kind: 'text', body: reply })
  }
  return { ok: true }
}

export async function sendOffer(matchId: number, offer: { type: OfferType; items: string[]; amount: string; duration: string }): Promise<Result> {
  const viewer = await requireViewer()
  const match = await loadMatch(matchId, viewer)
  if (!match) return { ok: false, error: 'Conversación no encontrada.' }
  if (!OFFER_TYPES.includes(offer.type)) return { ok: false, error: 'Tipo de propuesta inválido.' }
  const items = (Array.isArray(offer.items) ? offer.items : []).map((i) => String(i).trim().slice(0, 40)).filter(Boolean).slice(0, 6)
  if (!items.length) return { ok: false, error: 'Elegí al menos un beneficio.' }

  const meta: OfferMeta = {
    type: offer.type,
    items,
    amount: String(offer.amount ?? '').trim().slice(0, 40),
    duration: String(offer.duration ?? '').trim().slice(0, 40) || 'A definir',
    status: 'pendiente',
  }
  const label = viewer.role === 'deportista' ? 'Contrapropuesta' : 'Propuesta'
  const [inserted] = await db.insert(messages).values({ matchId, senderKey: viewer.key, kind: 'offer', body: `${label} de ${viewer.name}`, meta }).returning({ id: messages.id })

  if (match.otherKey.startsWith('seed:')) {
    await db.update(messages).set({ meta: { ...meta, status: 'aceptada' } }).where(eq(messages.id, inserted.id))
    await db.insert(messages).values({ matchId, senderKey: match.otherKey, kind: 'text', body: '¡Trato hecho! Te enviamos el contrato por mail esta semana.' })
  }
  return { ok: true }
}

export async function respondOffer(messageId: number, accept: boolean): Promise<Result> {
  const viewer = await requireViewer()
  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1)
  if (!msg || msg.kind !== 'offer') return { ok: false, error: 'Propuesta no encontrada.' }
  const match = await loadMatch(msg.matchId, viewer)
  if (!match) return { ok: false, error: 'Propuesta no encontrada.' }
  if (msg.senderKey === viewer.key) return { ok: false, error: 'No podés responder tu propia propuesta.' }
  const meta = msg.meta as OfferMeta
  if (meta.status !== 'pendiente') return { ok: false, error: 'Esta propuesta ya fue respondida.' }

  await db.update(messages).set({ meta: { ...meta, status: accept ? 'aceptada' : 'rechazada' } }).where(eq(messages.id, messageId))
  await db.insert(messages).values({
    matchId: msg.matchId,
    senderKey: 'system',
    kind: 'system',
    body: accept ? `${viewer.name} aceptó la propuesta. ¡Acuerdo cerrado!` : `${viewer.name} rechazó la propuesta.`,
  })
  return { ok: true }
}
