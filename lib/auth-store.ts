'use client'

import { useSyncExternalStore } from 'react'
import { authClient } from '@/lib/auth-client'
import { getMyRole } from '@/app/actions/profile'
import { registerUser, resendVerification } from '@/app/actions/register'
import type { AthleteProfile, OrgProfile, Role } from '@/lib/profile-types'

export type { Account, AthleteProfile, OrgProfile, Role, TimelineEntry } from '@/lib/profile-types'

const GUEST_KEY = 'dorsal:guest'
const CHANGE_EVENT = 'dorsal:guest-change'

let refreshRoute: () => void = () => window.location.reload()

export function setRouteRefresher(fn: () => void) {
  refreshRoute = fn
}

function setGuest(value: boolean) {
  if (value) sessionStorage.setItem(GUEST_KEY, '1')
  else sessionStorage.removeItem(GUEST_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

export function useIsGuest(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(GUEST_KEY) === '1',
    // The server renders the landing so it paints before any JavaScript runs.
    () => false,
  )
}

export class AuthError extends Error {}

export class EmailNotVerifiedError extends AuthError {
  constructor(public email: string) {
    super('Tenés que confirmar tu mail antes de ingresar. Te reenviamos el link: revisá tu bandeja de entrada.')
  }
}

export type PendingVerification = { email: string; devLink?: string; mailFailed?: boolean }

/** Creates the account; it stays inactive until the person opens the link we email them. */
export async function registerAccount(input: {
  role: Role
  email: string
  password: string
  name: string
  profile: AthleteProfile | OrgProfile
}): Promise<PendingVerification> {
  const result = await registerUser(input)
  if (!result.ok) throw new AuthError(result.error)
  return { email: result.email, devLink: result.devLink, mailFailed: result.mailFailed }
}

export async function resendVerificationEmail(email: string): Promise<PendingVerification> {
  const result = await resendVerification(email)
  if (!result.ok) throw new AuthError(result.error)
  return { email: result.email, devLink: result.devLink }
}

export async function signIn(role: Role, email: string, password: string) {
  const clean = email.trim().toLowerCase()
  const { error } = await authClient.signIn.email({ email: clean, password })
  if (error?.code === 'EMAIL_NOT_VERIFIED') throw new EmailNotVerifiedError(clean)
  if (error) throw new AuthError('Email o contraseña incorrectos.')

  const actualRole = await getMyRole()
  // Administrators sign in through the Institución entry.
  const isAdminEntry = role === 'evento' && actualRole === 'admin'
  if (actualRole !== role && !isAdminEntry) {
    await authClient.signOut()
    throw new AuthError(
      actualRole
        ? 'Ese usuario está registrado con otro perfil. Volvé y elegí el correcto.'
        : 'Ese usuario no tiene un perfil completo. Creá uno nuevo.',
    )
  }

  setGuest(false)
  refreshRoute()
}

export function enterAsGuest() {
  setGuest(true)
}

export async function signOut() {
  setGuest(false)
  await authClient.signOut()
  refreshRoute()
}
