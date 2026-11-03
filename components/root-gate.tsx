'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { setRouteRefresher, useIsGuest, type Account } from '@/lib/auth-store'
import { WhoAmI } from '@/components/auth/who-am-i'
import { AppStoreProvider } from '@/components/app-store'

const loadAppShell = () => import('@/components/app-shell')
const AppShell = dynamic(() => loadAppShell().then((m) => m.AppShell), {
  loading: () => <div className="min-h-dvh bg-background" aria-busy="true" />,
})

export function RootGate({ account }: { account: Account | null }) {
  const router = useRouter()
  const isGuest = useIsGuest()

  useEffect(() => {
    setRouteRefresher(() => router.refresh())
  }, [router])

  useEffect(() => {
    if (account || isGuest) return
    // The landing ships without the app; fetch it in the background so entering is instant.
    const id = setTimeout(loadAppShell, 1500)
    return () => clearTimeout(id)
  }, [account, isGuest])

  if (account) {
    const viewer = { role: account.role, name: account.name, account }
    return (
      <AppStoreProvider key={account.id} initialMode={account.role === 'deportista' ? 'deportista' : 'empresa'}>
        <AppShell viewer={viewer} />
      </AppStoreProvider>
    )
  }

  if (!isGuest) return <WhoAmI />

  return (
    <AppStoreProvider key="guest" initialMode="deportista">
      <AppShell viewer={{ role: 'invitado', name: 'Invitado' }} />
    </AppStoreProvider>
  )
}
