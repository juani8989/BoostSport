'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { getSession } from '@/lib/session'
import { ROLES, type AthleteProfile, type MerchItem, type OrgChallenge, type OrgProfile, type Role } from '@/lib/profile-types'

const MAX_PROFILE_BYTES = 3_000_000

async function getUserId() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getMyRole(): Promise<Role | 'admin' | null> {
  const userId = await getUserId()
  const [row] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.userId, userId)).limit(1)
  return (row?.role as Role | 'admin') ?? null
}

export async function createProfile(role: Role, profile: AthleteProfile | OrgProfile): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId()

  if (!ROLES.includes(role) || !profile || typeof profile !== 'object' || profile.kind !== role) {
    return { ok: false, error: 'Datos de perfil inválidos.' }
  }
  if (JSON.stringify(profile).length > MAX_PROFILE_BYTES) {
    return { ok: false, error: 'El perfil es demasiado grande. Probá con una foto más liviana.' }
  }

  const inserted = await db
    .insert(profiles)
    .values({ userId, role, data: profile })
    .onConflictDoNothing({ target: profiles.userId })
    .returning({ userId: profiles.userId })

  if (!inserted.length) return { ok: false, error: 'Este usuario ya tiene un perfil.' }
  return { ok: true }
}

const IMAGE_RE = /^(data:image\/(jpeg|png|webp);base64,|https:\/\/|\/)/

/** Lets a sponsor or institution edit its own profile. Sponsored athletes come from deals, so they are kept as they are. */
export async function updateMyOrgProfile(next: OrgProfile): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId()
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  const current = row?.data as OrgProfile | undefined
  if (!row || !current || (current.kind !== 'empresa' && current.kind !== 'evento')) return { ok: false, error: 'Solo sponsors e instituciones.' }
  if (!next || next.kind !== current.kind) return { ok: false, error: 'Datos de perfil inválidos.' }
  if (!next.orgName?.trim()) return { ok: false, error: 'Completá el nombre.' }
  if (next.logo && !IMAGE_RE.test(next.logo)) return { ok: false, error: 'El logo no es una imagen válida.' }

  const merged: OrgProfile = {
    ...current,
    orgName: next.orgName.trim(),
    category: next.category?.trim() ?? '',
    country: next.country?.trim() ?? '',
    city: next.city?.trim() ?? '',
    website: next.website?.trim() ?? '',
    lookingFor: next.lookingFor?.trim() ?? '',
    description: next.description?.trim() ?? '',
    logo: next.logo || undefined,
    merch: (next.merch ?? []).filter((m) => m.name?.trim()).map((m) => ({ name: m.name.trim(), price: m.price?.trim() ?? '', image: m.image && IMAGE_RE.test(m.image) ? m.image : undefined })),
    ...(current.kind === 'evento' ? { eventDate: next.eventDate ?? '', eventInfo: next.eventInfo ?? current.eventInfo } : {}),
  }
  if (JSON.stringify(merged).length > MAX_PROFILE_BYTES) return { ok: false, error: 'El perfil es demasiado grande. Probá con imágenes más livianas.' }
  await db.update(profiles).set({ data: merged, updatedAt: new Date() }).where(eq(profiles.userId, userId))
  return { ok: true }
}

const MAX_CHALLENGES = 10
const MAX_PRODUCTS = 24

/** The signed-in sponsor's profile row, or an error for anyone else. */
async function mySponsorProfile() {
  const userId = await getUserId()
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  const current = row?.data as OrgProfile | undefined
  if (!row || current?.kind !== 'empresa') return null
  return { userId, current }
}

async function saveSponsorProfile(userId: string, next: OrgProfile) {
  if (JSON.stringify(next).length > MAX_PROFILE_BYTES) return { ok: false as const, error: 'El perfil es demasiado grande. Probá con imágenes más livianas.' }
  await db.update(profiles).set({ data: next, updatedAt: new Date() }).where(eq(profiles.userId, userId))
  return { ok: true as const }
}

/** A sponsor proposes a challenge (or edits one, when the id already exists). */
export async function saveMyChallenge(input: Omit<OrgChallenge, 'id'> & { id?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await mySponsorProfile()
  if (!me) return { ok: false, error: 'Solo los sponsors pueden proponer desafíos.' }
  const title = String(input?.title ?? '').trim().slice(0, 80)
  const detail = String(input?.detail ?? '').trim().slice(0, 400)
  const reward = String(input?.reward ?? '').trim().slice(0, 80)
  const deadline = String(input?.deadline ?? '').trim()
  if (title.length < 3) return { ok: false, error: 'Poné un título al desafío.' }
  if (detail.length < 10) return { ok: false, error: 'Contá en qué consiste el desafío.' }
  if (!reward) return { ok: false, error: 'Indicá el premio.' }
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { ok: false, error: 'La fecha límite no es válida.' }
  const list0 = me.current.challenges ?? []
  const previous = list0.find((c) => c.id === input.id)
  // A new deadline can't be in the past (an old challenge keeps its own date while its text is edited).
  // Compared as YYYY-MM-DD in Argentina's time zone.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  if (deadline && deadline !== previous?.deadline && deadline < today) return { ok: false, error: 'La fecha límite ya pasó. Elegí una fecha de hoy en adelante.' }

  const list = me.current.challenges ?? []
  const id = input.id && list.some((c) => c.id === input.id) ? input.id : `ch-${Date.now().toString(36)}`
  if (!list.some((c) => c.id === id) && list.length >= MAX_CHALLENGES) return { ok: false, error: `Podés tener hasta ${MAX_CHALLENGES} desafíos abiertos.` }
  const item: OrgChallenge = { id, title, detail, reward, deadline }
  const challenges = list.some((c) => c.id === id) ? list.map((c) => (c.id === id ? item : c)) : [item, ...list]
  return saveSponsorProfile(me.userId, { ...me.current, challenges })
}

export async function removeMyChallenge(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await mySponsorProfile()
  if (!me) return { ok: false, error: 'Solo sponsors.' }
  return saveSponsorProfile(me.userId, { ...me.current, challenges: (me.current.challenges ?? []).filter((c) => c.id !== String(id)) })
}

/** Replaces the sponsor's shop with this list of products. */
export async function saveMyProducts(items: MerchItem[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await mySponsorProfile()
  if (!me) return { ok: false, error: 'Solo los sponsors tienen tienda.' }
  if (!Array.isArray(items)) return { ok: false, error: 'Datos inválidos.' }
  const merch = items
    .filter((m) => String(m?.name ?? '').trim())
    .slice(0, MAX_PRODUCTS)
    .map((m) => ({ name: String(m.name).trim().slice(0, 80), price: String(m.price ?? '').trim().slice(0, 30), image: m.image && IMAGE_RE.test(m.image) ? m.image : undefined }))
  return saveSponsorProfile(me.userId, { ...me.current, merch })
}
