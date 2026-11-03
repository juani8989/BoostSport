import 'server-only'

import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, user } from '@/lib/db/schema'
import { getProfileRow, getSession } from '@/lib/session'
import type { AthleteProfile, OrgProfile, Role } from '@/lib/profile-types'
import { athletes } from '@/lib/data'
import { companyFromKey, seedAthleteFromKey } from '@/lib/catalog'

export type ServerViewer = {
  id: string
  key: string
  name: string
  role: Role
  profile: AthleteProfile | OrgProfile
}

export const userKey = (id: string) => `user:${id}`

export async function getViewer(): Promise<ServerViewer | null> {
  const session = await getSession()
  if (!session?.user) return null
  const row = await getProfileRow(session.user.id)
  if (!row) return null
  const profile = row.data as AthleteProfile | OrgProfile
  const name = profile.kind === 'deportista' ? `${profile.firstName} ${profile.lastName}`.trim() : profile.orgName
  return { id: session.user.id, key: userKey(session.user.id), name: name || session.user.name, role: row.role as Role, profile }
}

export async function requireViewer() {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Unauthorized')
  return viewer
}

export type Party = {
  key: string
  name: string
  role: 'deportista' | 'empresa' | 'evento'
  subtitle: string
  image?: string
  initials: string
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

export function isHttpImage(src?: string) {
  return !!src && (src.startsWith('https://') || src.startsWith('/'))
}

export function partyFromProfile(key: string, profile: AthleteProfile | OrgProfile, fallbackName: string): Party {
  if (profile.kind === 'deportista') {
    const name = `${profile.firstName} ${profile.lastName}`.trim() || fallbackName
    return {
      key,
      name,
      role: 'deportista',
      subtitle: [profile.discipline, profile.country].filter(Boolean).join(' · '),
      image: isHttpImage(profile.photo) ? profile.photo : undefined,
      initials: initialsOf(name),
    }
  }
  const name = profile.orgName || fallbackName
  return {
    key,
    name,
    role: profile.kind,
    subtitle: [profile.category, profile.city].filter(Boolean).join(' · '),
    initials: initialsOf(name),
  }
}

export async function describeParties(keys: string[]): Promise<Map<string, Party>> {
  const result = new Map<string, Party>()
  const realIds: string[] = []

  for (const key of new Set(keys)) {
    const seedAthlete = seedAthleteFromKey(key)
    if (seedAthlete) {
      result.set(key, {
        key,
        name: seedAthlete.name,
        role: 'deportista',
        subtitle: `${seedAthlete.sport} · ${seedAthlete.city}`,
        image: seedAthlete.image,
        initials: initialsOf(seedAthlete.name),
      })
      continue
    }
    const company = companyFromKey(key)
    if (company) {
      result.set(key, { key, name: company.name, role: 'empresa', subtitle: company.industry, image: company.image, initials: company.initials })
      continue
    }
    if (key.startsWith('user:')) realIds.push(key.slice(5))
  }

  if (realIds.length) {
    const rows = await db
      .select({ userId: profiles.userId, data: profiles.data, name: user.name })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(inArray(profiles.userId, realIds))
    for (const row of rows) {
      const key = userKey(row.userId)
      result.set(key, partyFromProfile(key, row.data as AthleteProfile | OrgProfile, row.name))
    }
  }
  return result
}

export function seedAthleteIdByName(name: string) {
  return Object.values(athletes).find((a) => a.name === name)?.id
}
