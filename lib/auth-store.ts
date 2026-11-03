'use client'

import { useSyncExternalStore } from 'react'
import { authClient } from '@/lib/auth-client'
import { createProfile, getMyRole } from '@/app/actions/profile'
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

export async function registerAccount(input: {
  role: Role
  email: string
  password: string
  name: string
  profile: AthleteProfile | OrgProfile
}) {
  const { error } = await authClient.signUp.email({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    name: input.name.trim(),
  })
  if (error) {
    console.error('[auth] sign-up failed', error)
    throw new AuthError(
      error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
        ? 'No pudimos crear el usuario con ese email. Probá ingresar.'
        : 'No pudimos crear el usuario. Revisá los datos.',
    )
  }

  const result = await createProfile(input.role, input.profile)
  if (!result.ok) throw new AuthError(result.error)

  setGuest(false)
  refreshRoute()
}

export async function signIn(role: Role, email: string, password: string) {
  const { error } = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
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
