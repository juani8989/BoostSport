'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { getSession } from '@/lib/session'
import { ROLES, type AthleteProfile, type OrgProfile, type Role } from '@/lib/profile-types'

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
