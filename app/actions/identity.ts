'use server'

import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { identityReviews, profiles, user } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/admin'
import type { AiCheck } from '@/lib/identity-check'
import type { AthleteProfile } from '@/lib/profile-types'

export type IdentityStatus = 'pendiente' | 'aprobada' | 'rechazada'

export type IdentityReview = {
  userId: string
  name: string
  email: string
  discipline: string
  country: string
  status: IdentityStatus
  selfie: string | null
  document: string | null
  claimed: boolean
  /** Profiles on official Olympic or federation databases found during sign-up. */
  official: { source: string; url: string }[]
  photos: string[]
  sources: { title: string; url: string; source: string }[]
  aiCheck: AiCheck | null
  note: string | null
  createdAt: string
  reviewedAt: string | null
}

/** Identity checks for the admin panel; pending ones first, newest first. */
export async function listIdentityReviews(status: IdentityStatus = 'pendiente'): Promise<IdentityReview[]> {
  await requireAdmin()
  const rows = await db
    .select({ review: identityReviews, name: user.name, email: user.email, data: profiles.data })
    .from(identityReviews)
    .innerJoin(user, eq(user.id, identityReviews.userId))
    .leftJoin(profiles, eq(profiles.userId, identityReviews.userId))
    .where(eq(identityReviews.status, status))
    .orderBy(desc(identityReviews.createdAt))
    // The selfie and the ID travel with each row (up to a few MB): bring a few at a time.
    .limit(20)
  return rows.map(({ review: r, name, email, data }) => {
    const p = data as AthleteProfile | null
    const evidence = r.evidence as { claimed?: boolean; photos?: string[]; sources?: IdentityReview['sources']; official?: IdentityReview['official'] }
    return {
      userId: r.userId,
      name,
      email,
      discipline: p?.discipline ?? '',
      country: p?.country ?? '',
      status: r.status as IdentityStatus,
      selfie: r.selfie,
      document: r.document,
      claimed: !!evidence.claimed,
      official: evidence.official ?? [],
      photos: evidence.photos ?? [],
      sources: evidence.sources ?? [],
      aiCheck: (r.aiCheck as AiCheck | null) ?? null,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    }
  })
}

export async function countPendingIdentities(): Promise<number> {
  await requireAdmin()
  const rows = await db.select({ id: identityReviews.userId }).from(identityReviews).where(eq(identityReviews.status, 'pendiente'))
  return rows.length
}

/**
 * Approve: the athlete gets the tilde azul. Reject: they keep using the app without it, and the
 * note says why. Either way the selfie and the ID photo are deleted: they were only for this check.
 */
export async function decideIdentity(userId: string, approve: boolean, note = '', highPerformance = false): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin()
  const [row] = await db.select({ status: identityReviews.status }).from(identityReviews).where(eq(identityReviews.userId, String(userId))).limit(1)
  if (!row) return { ok: false, error: 'No encontramos esa verificación.' }
  // Another admin may have decided it already; don't overwrite their decision.
  if (row.status !== 'pendiente') return { ok: false, error: 'Esa verificación ya se decidió. Recargá la lista.' }
  if (!approve && !note.trim()) return { ok: false, error: 'Contá por qué la rechazás.' }

  const [prof] = await db.select({ data: profiles.data }).from(profiles).where(eq(profiles.userId, userId)).limit(1)
  const p = prof?.data as AthleteProfile | undefined
  if (p?.kind === 'deportista') {
    // Rejected after saying "soy yo" to someone found on the web: the profile can't keep that
    // person's photo, Wikipedia, press and summary. What they wrote themselves stays.
    const cleared: Partial<AthleteProfile> = approve ? {} : { famous: false, wikiUrl: undefined, press: [], summary: '', photo: p.photo?.startsWith('data:') ? p.photo : undefined }
    // "Alto rendimiento" only together with an approval: it confirms the official profiles are theirs.
    await db.update(profiles).set({ data: { ...p, ...cleared, identityVerified: approve, highPerformance: approve && highPerformance }, updatedAt: new Date() }).where(eq(profiles.userId, userId))
  }
  await db
    .update(identityReviews)
    .set({ status: approve ? 'aprobada' : 'rechazada', note: note.trim().slice(0, 500) || null, selfie: null, document: null, reviewedAt: new Date(), reviewedBy: admin.id })
    .where(eq(identityReviews.userId, userId))
  return { ok: true }
}
