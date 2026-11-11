'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { athletes, companyName } from '@/lib/data'

export type Mode = 'deportista' | 'empresa'
export type Tab = 'ruta' | 'vitrina' | 'match'
export type DealType = 'Producto' | 'Dinero' | 'Embajador'

export type AppNotification = {
  id: string
  title: string
  body: string
  time: string
  highlight?: boolean
}

type Store = {
  mode: Mode
  setMode: (mode: Mode) => void
  tab: Tab
  setTab: (tab: Tab) => void
  toggled: Set<string>
  toggle: (key: string) => void
  unlockedSecrets: Set<string>
  unlockSecret: (athleteId: string) => void
  matchedAthletes: Set<string>
  sendProposal: (athleteId: string, deal: DealType, message: string) => void
  /** Shows a short banner at the top. The notification list itself comes from the database. */
  pushNotification: (n: Omit<AppNotification, 'id' | 'time'>) => void
  banner: AppNotification | null
  dismissBanner: () => void
}

const StoreContext = createContext<Store | null>(null)

export function AppStoreProvider({
  children,
  initialMode = 'deportista',
}: {
  children: React.ReactNode
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [tab, setTab] = useState<Tab>('ruta')
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const [unlockedSecrets, setUnlockedSecrets] = useState<Set<string>>(new Set())
  const [matchedAthletes, setMatchedAthletes] = useState<Set<string>>(new Set())
  const [banner, setBanner] = useState<AppNotification | null>(null)

  const toggle = useCallback((key: string) => {
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const unlockSecret = useCallback((athleteId: string) => {
    setUnlockedSecrets((prev) => new Set(prev).add(athleteId))
  }, [])

  const pushNotification = useCallback((n: Omit<AppNotification, 'id' | 'time'>) => {
    const notification: AppNotification = {
      ...n,
      id: `n-${Date.now()}`,
      time: 'ahora',
    }
    setBanner(notification)
  }, [])

  const sendProposal = useCallback(
    (athleteId: string, deal: DealType, message: string) => {
      const athlete = athletes[athleteId]
      setMatchedAthletes((prev) => new Set(prev).add(athleteId))
      setUnlockedSecrets((prev) => new Set(prev).add(athleteId))
      pushNotification({
        title: `¡Hicieron match, ${athlete.name.split(' ')[0]}!`,
        body: `${companyName} te envió una propuesta de ${deal.toLowerCase()}: "${message}"`,
        highlight: true,
      })
    },
    [pushNotification],
  )

  const value = useMemo<Store>(
    () => ({
      mode,
      setMode,
      tab,
      setTab,
      toggled,
      toggle,
      unlockedSecrets,
      unlockSecret,
      matchedAthletes,
      sendProposal,
      pushNotification,
      banner,
      dismissBanner: () => setBanner(null),
    }),
    [
      mode,
      tab,
      toggled,
      toggle,
      unlockedSecrets,
      unlockSecret,
      matchedAthletes,
      sendProposal,
      pushNotification,
      banner,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
