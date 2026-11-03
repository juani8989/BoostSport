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
