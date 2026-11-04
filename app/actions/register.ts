'use server'

import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles, user } from '@/lib/db/schema'
import { devVerificationLink, takeEmailFailure } from '@/lib/email'
import { ROLES, type AthleteProfile, type OrgProfile, type Role } from '@/lib/profile-types'

const MAX_PROFILE_BYTES = 3_000_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Where the confirmation button lands; the app reads it to greet the new user.
const VERIFIED_CALLBACK = '/?verificado=1'

export type RegisterResult = { ok: true; email: string; devLink?: string; mailFailed?: boolean } | { ok: false; error: string }

/**
 * Creates the account and its profile in one server step, then Better Auth emails a
 * confirmation link. The account can't sign in until that link is opened.
 */
export async function registerUser(input: {
  role: Role
  email: string
  password: string
  name: string
  profile: AthleteProfile | OrgProfile
}): Promise<RegisterResult> {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const { role, profile } = input

  if (!ROLES.includes(role) || !profile || typeof profile !== 'object' || profile.kind !== role) {
    return { ok: false, error: 'Datos de perfil inválidos.' }
  }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'El email no es válido.' }
  if (!name) return { ok: false, error: 'Completá el nombre.' }
  if (typeof input.password !== 'string' || input.password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (JSON.stringify(profile).length > MAX_PROFILE_BYTES) {
    return { ok: false, error: 'El perfil es demasiado grande. Probá con una foto más liviana.' }
  }

  const [existing] = await db.select({ id: user.id, emailVerified: user.emailVerified }).from(user).where(eq(user.email, email)).limit(1)
  if (existing?.emailVerified) return { ok: false, error: 'Ya existe una cuenta con ese email. Probá ingresar.' }
  if (existing) {
    // An unconfirmed account can't sign in, so nothing hangs off it. Replace it: otherwise
    // whoever registered someone else's email first would own the account once its owner confirms.
    await db.delete(profiles).where(eq(profiles.userId, existing.id))
    await db.delete(user).where(eq(user.id, existing.id))
  }

  let userId: string
  try {
    const created = await auth.api.signUpEmail({ body: { email, password: input.password, name, callbackURL: VERIFIED_CALLBACK } })
    userId = created.user.id
  } catch (error) {
    console.error('[register] sign-up failed', error)
    return { ok: false, error: 'No pudimos crear el usuario. Revisá los datos o probá de nuevo.' }
  }

  await db.insert(profiles).values({ userId, role, data: profile }).onConflictDoNothing({ target: profiles.userId })
  // The account exists either way; if the mail didn't go out, the screen offers to resend it.
  return { ok: true, email, devLink: devVerificationLink(email), mailFailed: !!takeEmailFailure(email) }
}

/** Development only: the link that would have been mailed, so the flow can be tested without a mail provider. */
export async function pendingDevLink(email: string) {
  return typeof email === 'string' ? devVerificationLink(email.trim().toLowerCase()) : undefined
}

export async function resendVerification(email: string): Promise<RegisterResult> {
  const clean = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'El email no es válido.' }
  try {
    // Better Auth answers the same whether or not the account exists, so this can't be used to probe emails.
    await auth.api.sendVerificationEmail({ body: { email: clean, callbackURL: VERIFIED_CALLBACK } })
  } catch (error) {
    console.error('[register] resend failed', error)
    return { ok: false, error: 'No pudimos reenviar el mail. Probá en unos minutos.' }
  }
  if (takeEmailFailure(clean)) return { ok: false, error: 'No pudimos enviar el mail. Probá de nuevo en unos minutos.' }
  return { ok: true, email: clean, devLink: devVerificationLink(clean) }
}
