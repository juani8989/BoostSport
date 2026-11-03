import 'server-only'

import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

/** One session lookup per request, shared by every caller. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }))

/** One profile lookup per user per request. */
export const getProfileRow = cache(async (userId: string) => {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  return row ?? null
})
