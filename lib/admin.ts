import 'server-only'

import { getProfileRow, getSession } from '@/lib/session'

export const ADMIN_ROLE = 'admin'

export type AdminViewer = { id: string; name: string; email: string }

export async function getAdmin(): Promise<AdminViewer | null> {
  const session = await getSession()
  if (!session?.user) return null
  const row = await getProfileRow(session.user.id)
  if (row?.role !== ADMIN_ROLE) return null
  return { id: session.user.id, name: session.user.name, email: session.user.email }
}

export async function requireAdmin() {
  const admin = await getAdmin()
  if (!admin) throw new Error('Unauthorized')
  return admin
}
