'use server'

import { and, count, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, reactions, user } from '@/lib/db/schema'
import { getViewer, requireViewer, userKey } from '@/lib/viewer'
import { athletes, vitrinaPosts, type VitrinaPost } from '@/lib/data'
import { orgAffinity, seedAthleteFromKey, seedAthleteKey } from '@/lib/catalog'
import { isBlobUrl } from '@/lib/blob-url'
import { completenessOf, profileChecklist } from '@/lib/profile-checklist'
import { getSettingsMap } from '@/lib/user-settings'
import type { AthleteProfile, OrgProfile, VitrinaItem } from '@/lib/profile-types'
import { toggleReaction } from '@/app/actions/social'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

/** Who a Vitrina card belongs to, ready to show (seed athletes and real ones alike). */
export type VitrinaAthlete = {
  key: string
  name: string
  image?: string
  sport: string
  city: string
  category: string
  verified: boolean
  sponsorReady: number
  sponsoredBy?: string
}

type Card<T> = T extends unknown ? Omit<T, 'athleteId'> : never
type CardBase = {
  athlete: VitrinaAthlete
  real: boolean
  createdAt?: string
}

export type VitrinaCard = Card<VitrinaPost> &
  CardBase & {
    /** Applause count and what the viewer already did on this card. */
    applause: number
    applauded: boolean
    saved: boolean
    /** Whether the viewer already recommended this athlete to brands. */
    recommended: boolean
  }

type BaseCard = Card<VitrinaPost> & CardBase & { baseApplause?: number }

/** Sample cards keep their demo applause on top of the real one. */
const SAMPLE_APPLAUSE: Record<VitrinaPost['type'], number> = { achievement: 5120, stats: 980, secret: 1430 }

const MAX_ITEMS = 30
const MAX_IMAGE_CHARS = 1_400_000
const MEDALS = ['Oro', 'Plata', 'Bronce'] as const

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

function validImage(image: unknown) {
  if (image == null || image === '') return undefined
  if (typeof image !== 'string') return null
  if (isBlobUrl(image)) return image
  if (/^data:image\/(jpeg|png|webp);base64,/.test(image) && image.length <= MAX_IMAGE_CHARS) return image
  return null
}

async function loadMyAthleteProfile(userId: string) {
  const [row] = await db.select({ data: profiles.data }).from(profiles).where(and(eq(profiles.userId, userId), eq(profiles.role, 'deportista'))).limit(1)
  return row?.data as AthleteProfile | undefined
}

export type NewVitrinaItem =
  | { type: 'medalla'; title: string; event: string; medal: string; image?: string | null }
  | { type: 'marca'; metric: string; value: string; previous?: string; event?: string; image?: string | null }

/** Adds a medal or a personal best to the athlete's own Vitrina. */
export async function addVitrinaItem(input: NewVitrinaItem): Promise<Result<{ item: VitrinaItem }>> {
  const viewer = await requireViewer()
  if (viewer.role !== 'deportista') return { ok: false, error: 'Solo los deportistas pueden sumar logros a la Vitrina.' }
  const profile = await loadMyAthleteProfile(viewer.id)
  if (!profile) return { ok: false, error: 'No encontramos tu perfil.' }

  const image = validImage(input?.image)
  if (image === null) return { ok: false, error: 'La foto no es válida o es muy pesada.' }
  const base = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...(image ? { image } : {}) }

  let item: VitrinaItem
  if (input?.type === 'medalla') {
    const title = clean(input.title, 90)
    const event = clean(input.event, 90)
    const medal = MEDALS.find((m) => m === input.medal)
    if (title.length < 3) return { ok: false, error: 'Contá qué ganaste (por ejemplo, "Campeona nacional de 400 m").' }
    if (event.length < 3) return { ok: false, error: 'Poné en qué competencia fue.' }
    if (!medal) return { ok: false, error: 'Elegí la medalla.' }
    item = { ...base, type: 'medalla', title, event, medal }
  } else if (input?.type === 'marca') {
    const metric = clean(input.metric, 60)
    const value = clean(input.value, 30)
    const previous = clean(input.previous, 30)
    const event = clean(input.event, 90)
    if (metric.length < 2) return { ok: false, error: 'Poné en qué es la marca (por ejemplo, "400 m llanos").' }
    if (!value) return { ok: false, error: 'Poné tu nueva marca.' }
    item = { ...base, type: 'marca', metric, value, ...(previous ? { previous } : {}), ...(event ? { event } : {}) }
  } else {
    return { ok: false, error: 'Elegí si es una medalla o una marca personal.' }
  }

  const next: AthleteProfile = { ...profile, vitrina: [item, ...(profile.vitrina ?? [])].slice(0, MAX_ITEMS) }
  if (JSON.stringify(next).length > 3_000_000) return { ok: false, error: 'Tu perfil ya tiene demasiadas fotos. Probá sin foto o con una más liviana.' }
  await db.update(profiles).set({ data: next, updatedAt: new Date() }).where(eq(profiles.userId, viewer.id))
  return { ok: true, item }
}

export async function removeVitrinaItem(id: string): Promise<Result> {
  const viewer = await requireViewer()
  const profile = await loadMyAthleteProfile(viewer.id)
  if (!profile) return { ok: false, error: 'No encontramos tu perfil.' }
  const next: AthleteProfile = { ...profile, vitrina: (profile.vitrina ?? []).filter((v) => v.id !== String(id)) }
  await db.update(profiles).set({ data: next, updatedAt: new Date() }).where(eq(profiles.userId, viewer.id))
  return { ok: true }
}

function seedCards(): BaseCard[] {
  return vitrinaPosts.map(({ athleteId, ...post }) => {
    const a = athletes[athleteId]
    return {
      ...post,
      // The card id is also the reaction target: vit:v1, vit:v2…
      id: `vit:${post.id}`,
      baseApplause: SAMPLE_APPLAUSE[post.type],
      real: false,
      athlete: { key: seedAthleteKey(a.id), name: a.name, image: a.image, sport: a.sport, city: a.city, category: a.category, verified: a.level === 'Pro', sponsorReady: a.sponsorReady, sponsoredBy: a.sponsoredBy },
    } as BaseCard
  })
}

/** The Vitrina: logros real athletes uploaded (newest first), then the sample ones. */
export async function getVitrinaFeed(): Promise<VitrinaCard[]> {
  const [viewer, rows] = await Promise.all([
    getViewer(),
    db
      .select({ userId: profiles.userId, data: profiles.data, name: user.name })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(eq(profiles.role, 'deportista'))
      .limit(300),
  ])
  const withItems = rows.filter((r) => ((r.data as AthleteProfile).vitrina ?? []).length > 0)
  const settings = await getSettingsMap([...withItems.map((r) => r.userId), ...(viewer ? [viewer.id] : [])])
  const blockedByMe = new Set(viewer ? settings.get(viewer.id)?.blocked ?? [] : [])

  const real: BaseCard[] = []
  for (const r of withItems) {
    const key = userKey(r.userId)
    if (blockedByMe.has(key)) continue
    if (viewer && settings.get(r.userId)?.blocked.includes(viewer.key)) continue
    const p = r.data as AthleteProfile
    const athlete: VitrinaAthlete = {
      key,
      name: `${p.firstName} ${p.lastName}`.trim() || r.name,
      image: p.photo && /^(https:\/\/|\/|data:image\/)/.test(p.photo) ? p.photo : undefined,
      sport: p.discipline || 'Deportista',
      city: [p.club, p.country].filter(Boolean).join(' · '),
      category: p.age ? `${p.age} años` : '',
      verified: p.identityVerified,
      sponsorReady: completenessOf(profileChecklist(p)),
    }
    // Cards without a photo of their own use the athlete's photo, or a stadium.
    const image = (v: VitrinaItem) => v.image ?? athlete.image ?? '/images/podium.webp'
    for (const v of p.vitrina ?? []) {
      if (v.type === 'medalla') {
        real.push({ id: `vit:${v.id}`, type: 'achievement', image: image(v), title: v.title, event: v.event, medal: v.medal, verifiedBy: '', athlete, real: true, createdAt: v.createdAt })
      } else {
        real.push({
          id: `vit:${v.id}`,
          type: 'stats',
          image: image(v),
          metric: v.metric,
          current: v.value,
          points: [],
          summary: [v.previous ? `Antes: ${v.previous}` : '', v.event ?? ''].filter(Boolean).join(' · ') || 'Nueva marca personal',
          athlete,
          real: true,
          createdAt: v.createdAt,
        })
      }
    }
  }
  real.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const cards = [...real, ...seedCards()]

  // Real applause, and what the viewer already applauded, saved or recommended.
  const ids = cards.map((c) => c.id)
  const athleteTargets = [...new Set(cards.map((c) => `athlete:${c.athlete.key}`))]
  const [totals, mine] = await Promise.all([
    db
      .select({ targetId: reactions.targetId, n: count() })
      .from(reactions)
      .where(and(inArray(reactions.targetId, ids), eq(reactions.kind, 'aplauso')))
      .groupBy(reactions.targetId),
    viewer
      ? db
          .select({ targetId: reactions.targetId, kind: reactions.kind })
          .from(reactions)
          .where(and(eq(reactions.userId, viewer.id), inArray(reactions.targetId, [...ids, ...athleteTargets]), inArray(reactions.kind, ['aplauso', 'guardado', 'recomendar'])))
      : Promise.resolve([]),
  ])
  const applauseBy = new Map(totals.map((t) => [t.targetId, Number(t.n)]))
  const did = new Set(mine.map((m) => `${m.targetId}|${m.kind}`))
  return cards.map(({ baseApplause, ...c }) => ({
    ...c,
    applause: (baseApplause ?? 0) + (applauseBy.get(c.id) ?? 0),
    applauded: did.has(`${c.id}|aplauso`),
    saved: did.has(`${c.id}|guardado`),
    recommended: did.has(`athlete:${c.athlete.key}|recomendar`),
  })) as VitrinaCard[]
}

/** Brands whose profile fits a discipline well enough to hear about an athlete (same bar as Match). */
const RECOMMEND_MIN_AFFINITY = 60

async function brandsFor(discipline: string, needs: string[]) {
  const rows = await db.select({ data: profiles.data }).from(profiles).where(eq(profiles.role, 'empresa')).limit(300)
  return rows.filter((r) => orgAffinity({ discipline, needs }, r.data as OrgProfile) >= RECOMMEND_MIN_AFFINITY).length
}

/**
 * "Marca" in the Vitrina: recommends an athlete to the brands that fit their sport. Each of those
 * brands gets a notification (see getMyNotifications), and so does the athlete. Tapping again
 * takes the recommendation back.
 */
export async function recommendAthlete(athleteKey: string): Promise<Result<{ on: boolean; brands: number }>> {
  const viewer = await requireViewer()
  const key = String(athleteKey ?? '')
  if (!/^(user:[\w-]+|seed:at-[a-z]+)$/.test(key)) return { ok: false, error: 'Deportista inválido.' }
  if (key === viewer.key) return { ok: false, error: 'No podés recomendarte a vos mismo.' }

  let discipline = ''
  let needs: string[] = []
  const seed = seedAthleteFromKey(key)
  if (seed) {
    discipline = seed.sport
    needs = ['Indumentaria', 'Viajes']
  } else {
    const [row] = await db.select({ data: profiles.data }).from(profiles).where(and(eq(profiles.userId, key.slice(5)), eq(profiles.role, 'deportista'))).limit(1)
    if (!row) return { ok: false, error: 'No encontramos a ese deportista.' }
    const p = row.data as AthleteProfile
    discipline = p.discipline ?? ''
    needs = p.needs ?? []
  }

  const res = await toggleReaction(`athlete:${key}`, 'recomendar')
  if (!res.ok) return res
  const [still] = await db
    .select({ t: reactions.targetId })
    .from(reactions)
    .where(and(eq(reactions.userId, viewer.id), eq(reactions.targetId, `athlete:${key}`), eq(reactions.kind, 'recomendar')))
    .limit(1)
  return { ok: true, on: !!still, brands: still ? await brandsFor(discipline, needs) : 0 }
}
