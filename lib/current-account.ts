import 'server-only'

import type { Account, AthleteProfile, OrgProfile, Role } from '@/lib/profile-types'
import { getProfileRow, getSession } from '@/lib/session'

export async function getCurrentAccount(): Promise<Account | null> {
  const session = await getSession()
  if (!session?.user) return null

  const row = await getProfileRow(session.user.id)
  if (!row) return null

  return {
    id: session.user.id,
    role: row.role as Role,
    email: session.user.email,
    name: session.user.name,
    createdAt: row.createdAt.toISOString(),
    profile: row.data as AthleteProfile | OrgProfile,
  }
}
