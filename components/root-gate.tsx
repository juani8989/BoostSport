'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, MailWarning, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { setRouteRefresher, useIsGuest, type Account } from '@/lib/auth-store'
import { WhoAmI } from '@/components/auth/who-am-i'
import { AppStoreProvider } from '@/components/app-store'

const loadAppShell = () => import('@/components/app-shell')
const AppShell = dynamic(() => loadAppShell().then((m) => m.AppShell), {
  loading: () => <div className="min-h-dvh bg-background" aria-busy="true" />,
})

export type AuthNotice = 'verified' | 'expired' | 'invalid'

const noticeText: Record<AuthNotice, { title: string; body: string }> = {
  verified: { title: '¡Tu cuenta está confirmada!', body: 'Bienvenido a BoostSport.' },
  expired: { title: 'El link de confirmación venció', body: 'Ingresá con tu email y contraseña: te mandamos uno nuevo.' },
  invalid: { title: 'El link de confirmación no es válido', body: 'Puede que ya lo hayas usado. Probá ingresar; si hace falta, te mandamos uno nuevo.' },
}

function NoticeToast({ notice, signedIn, onClose }: { notice: AuthNotice; signedIn: boolean; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 7000)
    return () => clearTimeout(id)
  }, [onClose])
  const ok = notice === 'verified'
  const text = ok && !signedIn ? { title: noticeText.verified.title, body: 'Ya podés ingresar con tu email y contraseña.' } : noticeText[notice]
  const Icon = ok ? CheckCircle2 : MailWarning
  return (
    <div role="status" className="fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-olympic-white/15 bg-olympic-black/95 p-4 text-olympic-white shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2">
      <Icon className={ok ? 'mt-0.5 size-5 shrink-0 text-olympic-green' : 'mt-0.5 size-5 shrink-0 text-olympic-yellow'} />
      <div className="flex-1">
        <p className="font-semibold">{text.title}</p>
        <p className="text-sm text-olympic-white/70">{text.body}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="text-olympic-white/60">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function RootGate({ account, notice: initialNotice = null }: { account: Account | null; notice?: AuthNotice | null }) {
  const router = useRouter()
  const isGuest = useIsGuest()
  const [notice, setNotice] = useState(initialNotice)

  useEffect(() => {
    // Drop ?verificado / ?error from the address bar so a reload doesn't repeat the notice.
    if (initialNotice) window.history.replaceState(null, '', '/')
  }, [initialNotice])

  useEffect(() => {
    setRouteRefresher(() => router.refresh())
  }, [router])

  useEffect(() => {
    if (account || isGuest) return
    // The landing ships without the app; fetch it in the background so entering is instant.
    const id = setTimeout(loadAppShell, 1500)
    return () => clearTimeout(id)
  }, [account, isGuest])

  const toast = notice ? <NoticeToast notice={notice} signedIn={!!account} onClose={() => setNotice(null)} /> : null

  if (account) {
    const viewer = { role: account.role, name: account.name, account }
    return (
      <AppStoreProvider key={account.id} initialMode={account.role === 'deportista' ? 'deportista' : 'empresa'}>
        <AppShell viewer={viewer} />
        {toast}
      </AppStoreProvider>
    )
  }

  if (!isGuest) {
    return (
      <>
        <WhoAmI />
        {toast}
      </>
    )
  }

  return (
    <AppStoreProvider key="guest" initialMode="deportista">
      <AppShell viewer={{ role: 'invitado', name: 'Invitado' }} />
      {toast}
    </AppStoreProvider>
  )
}
