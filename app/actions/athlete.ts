'use server'

import { and, count, desc, eq, ilike, inArray, ne, or } from 'drizzle-orm'
import { postImageSrc } from '@/lib/media'
import { db } from '@/lib/db'
import { follows, matches, messages, posts, profiles, reactions } from '@/lib/db/schema'
import { describeParties, getViewer, requireViewer, userKey, type Party } from '@/lib/viewer'
import { seedAthleteFromKey, seedAthleteKey, seedDaily } from '@/lib/catalog'
import { rutaPosts, vitrinaPosts } from '@/lib/data'
import type { AthleteProfile, PressKind, PressLink } from '@/lib/profile-types'
import { assertPublicUrl, previewLink, searchMedia } from '@/lib/press'
import type { OfferMeta } from '@/app/actions/match'
import { getSettings } from '@/lib/user-settings'

export type ProfilePost = { id: string; body: string; image: string | null; kind: string; createdAt: string; likes: number }

/** A post by someone else that names the athlete. */
export type ProfileMention = { id: string; author: Party; body: string; image: string | null; createdAt: string }

export type PublicAthlete = {
  key: string
  party: Party
  isMe: boolean
  following: boolean
  supported: boolean
  canMessage: boolean
  matchId: number | null
  stats: { posts: number; followers: number; likes: number; apoyos: number }
  sponsors: string[]
  profile: Omit<AthleteProfile, 'selfie'>
  posts: ProfilePost[]
}

type Result = { ok: true } | { ok: false; error: string }

async function sumReactions(targetIds: string[], kind: string) {
  if (!targetIds.length) return 0
  const [row] = await db
    .select({ n: count() })
    .from(reactions)
    .where(and(inArray(reactions.targetId, targetIds), eq(reactions.kind, kind)))
  return Number(row?.n ?? 0)
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Posts by other people (real and seed) that mention the athlete by full name or Instagram handle. */
async function findMentions(targetKey: string, name: string, handle: string): Promise<ProfileMention[]> {
  const terms = [name.trim(), handle.trim().replace(/^@?/, '@')].filter((t) => t.length >= 4 && t !== '@')
  if (!terms.length) return []
  const lower = terms.map((t) => t.toLowerCase())
  const ownerId = targetKey.startsWith('user:') ? targetKey.slice(5) : null

  const realRows = await db
    .select()
    .from(posts)
    .where(and(or(...terms.map((t) => ilike(posts.body, `%${escapeLike(t)}%`))), ownerId ? ne(posts.userId, ownerId) : undefined))
    .orderBy(desc(posts.createdAt))
    .limit(30)
  const seedRows = seedDaily.filter((d) => seedAthleteKey(d.athleteId) !== targetKey && lower.some((t) => d.body.toLowerCase().includes(t)))
  const parties = await describeParties([...realRows.map((r) => userKey(r.userId)), ...seedRows.map((d) => seedAthleteKey(d.athleteId))])

  const now = Date.now()
  return [
    ...realRows.flatMap((r) => {
      const author = parties.get(userKey(r.userId))
      return author ? [{ id: `post:${r.id}`, author, body: r.body, image: postImageSrc(r.id, r.mediaUrl), createdAt: r.createdAt.toISOString() }] : []
    }),
    ...seedRows.flatMap((d) => {
      const author = parties.get(seedAthleteKey(d.athleteId))
      return author ? [{ id: d.id, author, body: d.body, image: d.image, createdAt: new Date(now - d.minutesAgo * 60_000).toISOString() }] : []
    }),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Sponsors with an accepted offer: one join for the offers, one lookup for the names. */
async function acceptedSponsors(athleteKey: string): Promise<string[]> {
  const offers = await db
    .select({ orgKey: matches.orgKey, meta: messages.meta })
    .from(messages)
    .innerJoin(matches, eq(matches.id, messages.matchId))
    .where(and(eq(matches.athleteKey, athleteKey), eq(messages.kind, 'offer')))
  const keys = [...new Set(offers.filter((o) => (o.meta as OfferMeta | null)?.status === 'aceptada').map((o) => o.orgKey))]
  if (!keys.length) return []
  const parties = await describeParties(keys)
  return [...parties.values()].map((p) => p.name)
}

/** Profile row, settings and posts of a real user, in two round trips. */
async function ownerData(userId: string) {
  const [[row], settings, rows] = await Promise.all([
    db.select({ data: profiles.data }).from(profiles).where(eq(profiles.userId, userId)).limit(1),
    getSettings(userId),
    db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt)).limit(30),
  ])
  const ids = rows.map((p) => `post:${p.id}`)
  const counts = ids.length
    ? await db
        .select({ targetId: reactions.targetId, kind: reactions.kind, n: count() })
        .from(reactions)
        .where(and(inArray(reactions.targetId, ids), inArray(reactions.kind, ['like', 'apoyo'])))
        .groupBy(reactions.targetId, reactions.kind)
    : []
  return { row, settings, rows, counts }
}

export async function getAthleteProfile(key: string): Promise<PublicAthlete | null> {
  const viewer = await getViewer()
  const targetKey = key === 'me' && viewer ? viewer.key : key
  if (!/^(user:[\w-]+|seed:at-[a-z]+)$/.test(targetKey)) return null
  const seed = seedAthleteFromKey(targetKey)
  const seedPosts = seed ? seedDaily.filter((s) => s.athleteId === seed.id) : []

  // Everything independent goes out at once: each round trip to the database counts.
  const [parties, followerRow, followingRow, supportRow, matchRow, sponsors, athleteSupport, seedLikes, owner] = await Promise.all([
    describeParties([targetKey]),
    db.select({ n: count() }).from(follows).where(eq(follows.targetId, targetKey)),
    viewer
      ? db.select({ t: follows.targetId }).from(follows).where(and(eq(follows.followerId, viewer.id), eq(follows.targetId, targetKey))).limit(1)
      : Promise.resolve([]),
    viewer
      ? db
          .select({ t: reactions.targetId })
          .from(reactions)
          .where(and(eq(reactions.userId, viewer.id), eq(reactions.targetId, `athlete:${targetKey}`), eq(reactions.kind, 'apoyo')))
          .limit(1)
      : Promise.resolve([]),
    viewer && viewer.role !== 'deportista'
      ? db.select({ id: matches.id }).from(matches).where(and(eq(matches.athleteKey, targetKey), eq(matches.orgKey, viewer.key))).limit(1)
      : Promise.resolve([]),
    acceptedSponsors(targetKey),
    sumReactions([`athlete:${targetKey}`], 'apoyo'),
    seed ? sumReactions(seedPosts.map((p) => p.id), 'like') : Promise.resolve(0),
    seed ? Promise.resolve(null) : ownerData(targetKey.slice(5)),
  ])
  const party = parties.get(targetKey)
  if (!party || party.role !== 'deportista') return null

  const base = {
    key: targetKey,
    party,
    isMe: viewer?.key === targetKey,
    following: followingRow.length > 0,
    supported: supportRow.length > 0,
    canMessage: matchRow.length > 0,
    matchId: matchRow[0]?.id ?? null,
  }

  if (seed) {
    const goals = rutaPosts.filter((p) => 'athleteId' in p && p.athleteId === seed.id && (p.type === 'goal' || p.type === 'project'))
    const wins = vitrinaPosts.filter((p) => 'athleteId' in p && p.athleteId === seed.id)
    const [first, ...rest] = seed.name.split(' ')
    const baseLikes = seedPosts.reduce((acc, p) => acc + p.baseLikes, 0)
    return {
      ...base,
      stats: {
        posts: seedPosts.length + 12,
        followers: Math.round(parseFloat(seed.followers.replace(',', '.')) * 1000) + Number(followerRow[0]?.n ?? 0),
        likes: baseLikes + seedLikes,
        apoyos: Math.round(baseLikes / 6) + athleteSupport,
      },
      sponsors: [...new Set([...(seed.sponsoredBy ? [seed.sponsoredBy] : []), ...sponsors])],
      profile: {
        kind: 'deportista',
        firstName: first,
        lastName: rest.join(' '),
        country: seed.city,
        discipline: seed.sport,
        famous: false,
        identityVerified: true,
        photo: seed.image,
        age: '',
        goals: goals.map((g) => ('title' in g ? g.title : '')).filter(Boolean).join('\n') || 'Clasificar al próximo Nacional',
        achievements: wins.map((w) => ('title' in w ? String(w.title) : '')).filter(Boolean).join('\n') || `Nivel ${seed.level} · ${seed.category}`,
        studies: '',
        recognitions: '',
        timeline: [],
        socials: { instagram: seed.handle, tiktok: '', x: '', youtube: '' },
        needs: ['Indumentaria', 'Viajes'],
        needsDetail: '',
      },
      posts: seedPosts.map((p) => ({ id: p.id, body: p.body, image: p.image, kind: p.kind, createdAt: new Date(Date.now() - p.minutesAgo * 60_000).toISOString(), likes: p.baseLikes })),
    }
  }

  if (!owner?.row) return null
  const { settings } = owner
  const { selfie: _selfie, ...rawProfile } = owner.row.data as AthleteProfile
  if (!base.isMe && viewer && settings.blocked.includes(viewer.key)) return null

  // Privacy choices stored in user_settings. The owner always sees everything.
  const restricted = !base.isMe && settings.privacy.privateAccount && !base.following
  const profile = base.isMe
    ? rawProfile
    : {
        ...rawProfile,
        age: settings.privacy.showAge ? rawProfile.age : '',
        socials: settings.privacy.showSocials ? rawProfile.socials : { instagram: '', tiktok: '', x: '', youtube: '' },
        goals: restricted ? '' : rawProfile.goals,
        achievements: restricted ? '' : rawProfile.achievements,
        timeline: restricted ? [] : rawProfile.timeline,
        gallery: restricted ? [] : rawProfile.gallery,
        press: restricted ? [] : rawProfile.press,
        pressHidden: undefined,
      }
  const archived = new Set(base.isMe ? [] : settings.archived)
  const myPosts = restricted ? [] : owner.rows.filter((p) => !archived.has(`post:${p.id}`))
  const visible = new Set(myPosts.map((p) => `post:${p.id}`))
  const likesBy = new Map<string, number>()
  let postApoyos = 0
  for (const c of owner.counts) {
    if (!visible.has(c.targetId)) continue
    if (c.kind === 'like') likesBy.set(c.targetId, Number(c.n))
    else postApoyos += Number(c.n)
  }

  return {
    ...base,
    stats: {
      posts: myPosts.length,
      followers: base.isMe || settings.privacy.showFollowersCount ? Number(followerRow[0]?.n ?? 0) : -1,
      likes: [...likesBy.values()].reduce((a, b) => a + b, 0),
      apoyos: postApoyos + athleteSupport,
    },
    sponsors: base.isMe || settings.privacy.showSponsors ? sponsors : [],
    profile,
    posts: myPosts.map((p) => ({ id: `post:${p.id}`, body: p.body, image: postImageSrc(p.id, p.mediaUrl), kind: p.kind, createdAt: p.createdAt.toISOString(), likes: likesBy.get(`post:${p.id}`) ?? 0 })),
  }
}

/** Mentions and news load only when the Menciones tab opens: the news search is the slowest part of a profile. */
export async function getAthleteMentions(key: string): Promise<{ mentions: ProfileMention[]; news: PressLink[] }> {
  const viewer = await getViewer()
  const targetKey = key === 'me' && viewer ? viewer.key : key
  if (!/^(user:[\w-]+|seed:at-[a-z]+)$/.test(targetKey)) return { mentions: [], news: [] }
  const seed = seedAthleteFromKey(targetKey)
  if (seed) return { mentions: await findMentions(targetKey, seed.name, seed.handle), news: [] }

  const userId = targetKey.slice(5)
  const [[row], settings, parties, followingRow] = await Promise.all([
    db.select({ data: profiles.data }).from(profiles).where(eq(profiles.userId, userId)).limit(1),
    getSettings(userId),
    describeParties([targetKey]),
    viewer ? db.select({ t: follows.targetId }).from(follows).where(and(eq(follows.followerId, viewer.id), eq(follows.targetId, targetKey))).limit(1) : Promise.resolve([]),
  ])
  const party = parties.get(targetKey)
  if (!row || !party) return { mentions: [], news: [] }
  const isMe = viewer?.key === targetKey
  if (!isMe && viewer && settings.blocked.includes(viewer.key)) return { mentions: [], news: [] }
  const restricted = !isMe && settings.privacy.privateAccount && !followingRow.length
  if (restricted) return { mentions: [], news: [] }
  const profile = row.data as AthleteProfile
  const [mentions, news] = await Promise.all([
    // "Menciones y etiquetas: Nadie" in Configuración hides them from the profile.
    settings.interactions.mentions === 'nadie' ? Promise.resolve([]) : findMentions(targetKey, party.name, profile.socials?.instagram ?? ''),
    newsFor(profile, party.name),
  ])
  return { mentions, news }
}

export async function updateMyAthleteProfile(next: AthleteProfile): Promise<Result> {
  const viewer = await requireViewer()
  if (viewer.role !== 'deportista' || viewer.profile.kind !== 'deportista') return { ok: false, error: 'Solo deportistas.' }
  if (!next || next.kind !== 'deportista' || !next.firstName?.trim() || !next.discipline?.trim()) {
    return { ok: false, error: 'Completá nombre y disciplina.' }
  }
  const current = viewer.profile
  const merged: AthleteProfile = {
    ...next,
    famous: current.famous,
    identityVerified: current.identityVerified,
    selfie: current.selfie,
    wikiUrl: current.wikiUrl,
    // Managed from the Menciones tab, not from the profile form.
    press: current.press,
    pressHidden: current.pressHidden,
    nicknames: [...new Set((Array.isArray(next.nicknames) ? next.nicknames : []).map((n) => String(n).trim().slice(0, 40)).filter(Boolean))].slice(0, 8),
    club: typeof next.club === 'string' ? next.club.trim().slice(0, 80) : undefined,
  }
  if (JSON.stringify(merged).length > 3_000_000) return { ok: false, error: 'El perfil es demasiado grande.' }
  await db.update(profiles).set({ data: merged, updatedAt: new Date() }).where(eq(profiles.userId, viewer.id))
  return { ok: true }
}

export async function getMyOrgSummary() {
  const viewer = await requireViewer()
  const rows = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.orgKey, viewer.key), eq(matches.athleteKey, viewer.key)))
  return { matches: rows.length, key: viewer.key, seedKeyExample: seedAthleteKey('valentina'), userKey: userKey(viewer.id) }
}

async function newsFor(profile: AthleteProfile, name: string): Promise<PressLink[]> {
  if (name.trim().split(/\s+/).length < 2) return []
  const handles = Object.values(profile.socials ?? {})
    .map((h) => String(h ?? '').trim())
    .filter((h) => h.length >= 4)
    .map((h) => (h.startsWith('@') ? h : `@${h.replace(/^https?:\/\/[^/]+\//, '')}`))
  const found = await searchMedia({
    name: name.trim(),
    nicknames: (profile.nicknames ?? []).map((n) => n.trim()).filter((n) => n.length >= 3),
    handles: [...new Set(handles)],
    discipline: profile.discipline ?? '',
    club: profile.club ?? '',
    country: profile.country ?? '',
    famous: !!(profile.famous || profile.wikiUrl),
  })
  const hidden = new Set(profile.pressHidden ?? [])
  const added = new Set((profile.press ?? []).map((p) => p.url))
  return found.filter((n) => !hidden.has(n.url) && !added.has(n.url))
}

const PRESS_KINDS: PressKind[] = ['noticia', 'entrevista', 'video', 'podcast', 'link']
const MAX_PRESS = 50

async function requireAthlete() {
  const viewer = await requireViewer()
  if (viewer.role !== 'deportista' || viewer.profile.kind !== 'deportista') throw new Error('Solo deportistas.')
  return { viewer, profile: viewer.profile }
}

async function saveAthlete(userId: string, profile: AthleteProfile) {
  await db.update(profiles).set({ data: profile, updatedAt: new Date() }).where(eq(profiles.userId, userId))
}

/** Reads title, medium, date and image of a link so the athlete only has to paste it. */
export async function previewPressLink(url: string): Promise<Result & { link?: PressLink }> {
  await requireAthlete()
  try {
    return { ok: true, link: await previewLink(String(url ?? '')) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No pudimos leer el link.' }
  }
}

export async function addPressLink(input: PressLink): Promise<Result> {
  const { viewer, profile } = await requireAthlete()
  let url: URL
  try {
    url = await assertPublicUrl(String(input?.url ?? ''))
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Link inválido.' }
  }
  const title = String(input.title ?? '').trim().slice(0, 200)
  if (title.length < 3) return { ok: false, error: 'Poné un título.' }
  const image = typeof input.image === 'string' && input.image.startsWith('https://') ? input.image.slice(0, 1000) : undefined
  const link: PressLink = {
    url: url.toString(),
    title,
    source: String(input.source ?? '').trim().slice(0, 80) || url.hostname.replace(/^www\./, ''),
    kind: PRESS_KINDS.includes(input.kind) ? input.kind : 'noticia',
    date: input.date && !Number.isNaN(Date.parse(input.date)) ? new Date(input.date).toISOString() : undefined,
    image,
    addedAt: new Date().toISOString(),
  }
  const press = [link, ...(profile.press ?? []).filter((p) => p.url !== link.url)].slice(0, MAX_PRESS)
  await saveAthlete(viewer.id, { ...profile, press })
  return { ok: true }
}

export async function removePressLink(url: string): Promise<Result> {
  const { viewer, profile } = await requireAthlete()
  await saveAthlete(viewer.id, { ...profile, press: (profile.press ?? []).filter((p) => p.url !== url) })
  return { ok: true }
}

/** Hides a news item found automatically (for example, a namesake). */
export async function hideNewsItem(url: string): Promise<Result> {
  const { viewer, profile } = await requireAthlete()
  const hidden = [...new Set([...(profile.pressHidden ?? []), String(url).slice(0, 2000)])].slice(-200)
  await saveAthlete(viewer.id, { ...profile, pressHidden: hidden })
  return { ok: true }
}
