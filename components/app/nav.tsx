'use client'

import { createContext, useContext } from 'react'
import type { Account, Role } from '@/lib/profile-types'
import type { PageId } from '@/components/settings/types'

export type MainTab = 'inicio' | 'vitrina' | 'match' | 'mensajes' | 'perfil'

export type Nav = {
  role: Role | 'invitado'
  account?: Account
  goTo: (tab: MainTab) => void
  /** Opens a profile; with postId, opens that post in the viewer. */
  openProfile: (key: string, postId?: string) => void
  openChat: (matchId: number) => void
  requireAccount: () => boolean
  /** Opens Configuración, optionally on one of its screens (for example 'guardados'). */
  openSettings: (page?: PageId) => void
}

export const NavContext = createContext<Nav | null>(null)

export function useNav() {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('useNav must be used inside NavContext')
  return nav
}
