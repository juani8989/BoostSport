'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, user } from '@/lib/db/schema'
import { getViewer, partyFromProfile, userKey, type Party } from '@/lib/viewer'
import { orgAffinity } from '@/lib/catalog'
import { getSettingsMap, idFromKey } from '@/lib/user-settings'
import type { AthleteProfile, OrgProfile } from '@/lib/profile-types'

/** A real sponsor or institution (an account, not a sample), ready to show. */
export type RealOrg = {
  key: string
  party: Party
  profile: OrgProfile
  /** How well it fits the athlete looking at it (only for athletes). */
  affinity: number | null
}

type Row = { userId: string; data: unknown; name: string }

async function visibleOrgs(rows: Row[]) {
  const viewer = await getViewer()
  const settings = await getSettingsMap([...rows.map((r) => r.userId), ...(viewer ? [viewer.id] : [])])
  const mine = viewer ? settings.get(viewer.id) : undefined
  const athlete = viewer?.profile.kind === 'deportista' ? (viewer.profile as AthleteProfile) : null

  const list: RealOrg[] = []
  for (const r of rows) {
    const key = userKey(r.userId)
    if (r.userId === viewer?.id) continue
    const st = settings.get(r.userId)
    if (st?.privacy.showInSearch === false) continue
    if (viewer && (st?.blocked.includes(viewer.key) || mine?.blocked.includes(key))) continue
    const profile = r.data as OrgProfile
    list.push({
      key,
      party: partyFromProfile(key, profile, r.name),
      profile,
      affinity: athlete ? orgAffinity({ discipline: athlete.discipline ?? '', needs: athlete.needs ?? [] }, profile) : null,
    })
  }
  return list
}

/** Real sponsors (empresa) or institutions (evento): best fit first for athletes, newest first otherwise. */
export async function getRealOrgs(kind: 'empresa' | 'evento'): Promise<RealOrg[]> {
  if (kind !== 'empresa' && kind !== 'evento') return []
  const rows = await db
    .select({ userId: profiles.userId, data: profiles.data, name: user.name, createdAt: profiles.createdAt })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(eq(profiles.role, kind))
    .limit(100)
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const list = await visibleOrgs(rows)
  return list.sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))
}

/** One real organization by key, for its page (from the search, for example). */
export async function getRealOrg(key: string): Promise<RealOrg | null> {
  const id = idFromKey(String(key ?? ''))
  if (!id) return null
  const rows = await db
    .select({ userId: profiles.userId, data: profiles.data, name: user.name })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(and(eq(profiles.userId, id)))
    .limit(1)
  const row = rows[0]
  if (!row || (row.data as { kind?: string }).kind === 'deportista' || (row.data as { kind?: string }).kind === 'admin') return null
  const [org] = await visibleOrgs(rows)
  return org ?? null
}
