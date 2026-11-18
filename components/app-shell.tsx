'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bell, Handshake, House, LogOut, Menu, MessageCircle, Search, UserRound } from 'lucide-react'
import { signOut, type Account, type Role } from '@/lib/auth-store'
import { useAppStore } from '@/components/app-store'
import { SearchPanel } from '@/components/search/search-panel'
import { NotificationBanner, NotificationsPanel, useNotifications } from '@/components/notifications'
import { NavContext, type MainTab, type Nav } from '@/components/app/nav'
import { Sheet } from '@/components/app/kit'
import { usePrefetchTabs } from '@/components/app/prefetch'
import { HomeFeed } from '@/components/home/home-feed'
import { MatchDeck } from '@/components/match/match-deck'
import { Inbox } from '@/components/messages/inbox'
import { ChatThread } from '@/components/messages/chat-thread'
import { AthleteProfileView } from '@/components/profile/athlete-profile'
import { OrgProfileView } from '@/components/profile/org-profile'
import { cn } from '@/lib/utils'
import { BrandLine, RefreshLogo } from '@/components/brand-logo'
import { DesktopSidebar } from '@/components/app/desktop-sidebar'
import { SettingsPanel } from '@/components/settings/settings-panel'
import type { PageId } from '@/components/settings/types'
import { ApplyPreferences } from '@/components/settings/apply-preferences'
import { useSettings } from '@/components/settings/use-settings'
import { OPEN_TUTORIAL_EVENT, Tutorial } from '@/components/onboarding/tutorial'

const tabs: { id: MainTab; label: string; icon: typeof House }[] = [
  { id: 'inicio', label: 'Inicio', icon: House },
  { id: 'buscar', label: 'Buscar', icon: Search },
  { id: 'match', label: 'Match', icon: Handshake },
  { id: 'mensajes', label: 'Mensajes', icon: MessageCircle },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
]

export type Viewer = {
  role: Role | 'invitado'
  name: string
  account?: Account
}

/** Short name for the Perfil tab: the nickname if there is one, else the first name(s), or the organization's name. */
function shortName(viewer: Viewer) {
  const profile = viewer.account?.profile
  if (profile?.kind === 'deportista') return profile.nicknames?.find((n) => n.trim())?.trim() || profile.firstName.trim() || viewer.name
  if (profile) return profile.orgName.trim() || viewer.name
  return viewer.name
}

function profilePhoto(viewer: Viewer) {
  const profile = viewer.account?.profile
  const src = profile?.kind === 'deportista' ? profile.photo : profile?.logo
  return src && /^(https:\/\/|\/|data:image\/)/.test(src) ? src : undefined
}

/** The viewer's own photo (or initials) in place of the Perfil icon. */
function MeAvatar({ src, name, active, className }: { src?: string; name: string; active: boolean; className?: string }) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-bold ring-2', active ? 'ring-foreground' : 'ring-transparent', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  )
}

export function AppShell({ viewer }: { viewer: Viewer }) {
  const { pushNotification } = useAppStore()
  const [tab, setTab] = useState<MainTab>('inicio')
  const [profileKey, setProfileKey] = useState<string | null>(null)
  const [chatId, setChatId] = useState<number | null>(null)
  const [askAccount, setAskAccount] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState<false | true | PageId>(false)
  const [sharedPost, setSharedPost] = useState<string | undefined>()
  const isGuest = viewer.role === 'invitado'
  // Feeds and the search (with its side column) use the whole screen on computers.
  const fullWidth = (tab === 'inicio' || tab === 'buscar') && !profileKey && chatId === null

  // Welcome tutorial: once per account (saved in its settings), and again from Ayuda.
  const { settings: prefs, ready: prefsReady, update: updatePrefs } = useSettings(!isGuest)
  const [tutorialOpen, setTutorialOpen] = useState<boolean | null>(null)
  useEffect(() => {
    if (prefsReady && tutorialOpen === null) setTutorialOpen(!prefs.tutorialSeen)
  }, [prefsReady, prefs.tutorialSeen, tutorialOpen])
  useEffect(() => {
    const open = () => setTutorialOpen(true)
    window.addEventListener(OPEN_TUTORIAL_EVENT, open)
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, open)
  }, [])
  const closeTutorial = () => {
    setTutorialOpen(false)
    if (!prefs.tutorialSeen) updatePrefs({ tutorialSeen: true })
  }
  const { items: notifications, unread: unreadCount, paused, markRead } = useNotifications(!isGuest)
  const markAllRead = markRead
  // A short banner when something new arrives while the app is open (not for what was already there).
  const newestSeen = useRef<string | null>(null)
  useEffect(() => {
    const newest = notifications[0]
    if (!newest) return
    if (newestSeen.current !== null && newest.at > newestSeen.current && newest.unread && !paused) {
      pushNotification({ title: newest.actor.name, body: newest.text, highlight: true })
    }
    if (!newestSeen.current || newest.at > newestSeen.current) newestSeen.current = newest.at
  }, [notifications, paused, pushNotification])

  // Links shared from Configuración → Herramientas open that profile.
  useEffect(() => {
    const url = new URL(window.location.href)
    const key = url.searchParams.get('perfil')
    if (!key || !/^(user:[\w-]+|seed:at-[a-z]+)$/.test(key)) return
    setProfileKey(key)
    const post = url.searchParams.get('post')
    if (post && /^(seed:d\d+|post:\d+)$/.test(post)) setSharedPost(post)
    url.searchParams.delete('perfil')
    url.searchParams.delete('post')
    window.history.replaceState(null, '', url.toString())
  }, [])
  usePrefetchTabs(viewer.role)
  const visibleTabs = isGuest ? tabs.filter((t) => t.id === 'inicio' || t.id === 'buscar') : tabs

  // Going to a section closes whatever is open on top (notifications, settings, a profile, a chat),
  // so you land on the section you tapped instead of finding it once you close the panel.
  const goTo = useCallback((next: MainTab) => {
    setShowNotifications(false)
    setShowSettings(false)
    setAskAccount(false)
    setProfileKey(null)
    setChatId(null)
    setTab(next)
  }, [])

  // Only one panel at a time: opening notifications closes settings and the other way around.
  const openNotifications = () => {
    setShowSettings(false)
    setShowNotifications(true)
    markAllRead()
  }
  const openSettingsPanel = (page?: PageId) => {
    setShowNotifications(false)
    setShowSettings(page ?? true)
  }

  const nav = useMemo<Nav>(
    () => ({
      role: viewer.role,
      account: viewer.account,
      goTo,
      openProfile: (key, postId) => {
        setSharedPost(postId)
        setProfileKey(key)
      },
      openChat: (id) => {
        setProfileKey(null)
        setTab('mensajes')
        setChatId(id)
      },
      openSettings: (page) => {
        setShowNotifications(false)
        setShowSettings(page ?? true)
      },
      requireAccount: () => {
        if (!isGuest) return true
        setAskAccount(true)
        return false
      },
    }),
    [viewer.role, viewer.account, goTo, isGuest],
  )

  const meName = shortName(viewer)
  const mePhoto = profilePhoto(viewer)

  return (
    <NavContext.Provider value={nav}>
      <main className="flex min-h-dvh items-center justify-center md:items-stretch md:justify-start">
        <DesktopSidebar
          tabs={visibleTabs}
          active={profileKey ? null : tab}
          onTab={goTo}
          isGuest={isGuest}
          meName={meName}
          meAvatar={<MeAvatar src={mePhoto} name={meName} active={!profileKey && tab === 'perfil'} className="size-7" />}
          unreadCount={unreadCount}
          onNotifications={openNotifications}
          onSettings={() => openSettingsPanel()}
        />
        <div className="flex w-full min-w-0 justify-center md:flex-1 md:bg-secondary/40">
        {/* On computers this is a centered content column; on phones it fills the screen as before. */}
        <div
          className={cn(
            'relative h-dvh w-full overflow-hidden bg-background',
            // Feeds use the whole screen on computers; profile, messages and Match stay in a readable column.
            fullWidth ? 'md:max-w-none' : 'md:max-w-[640px] md:border-x md:border-border',
          )}
        >
          <BrandLine className="absolute inset-x-0 top-0 z-40" />
          <header className="pointer-events-none absolute inset-x-0 top-0.5 z-30 flex md:hidden items-center justify-between gap-2 bg-gradient-to-b from-background/90 to-transparent px-4 pb-6 pt-4">
            <RefreshLogo className="pointer-events-auto" />
            <div className="pointer-events-auto flex items-center gap-2">
              {isGuest ? (
                <button type="button" onClick={signOut} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  Crear cuenta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openNotifications}
                  aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
                  className="relative flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur"
                >
                  <Bell className="size-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              )}
              {isGuest ? (
                <button type="button" onClick={signOut} aria-label="Cerrar sesión" className="flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur">
                  <LogOut className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openSettingsPanel()}
                  aria-label="Configuración y actividad"
                  aria-haspopup="dialog"
                  className="flex size-9 items-center justify-center rounded-full bg-background/60 backdrop-blur"
                >
                  <Menu className="size-5" />
                </button>
              )}
            </div>
          </header>

          <div className="h-full">
            {tab === 'inicio' ? <HomeFeed /> : null}
            {tab === 'buscar' ? <SearchPanel /> : null}
            {tab === 'match' && !isGuest ? <MatchDeck /> : null}
            {tab === 'mensajes' && !isGuest ? <Inbox /> : null}
            {tab === 'perfil' && !isGuest ? viewer.role === 'deportista' ? <AthleteProfileView profileKey="me" /> : <OrgProfileView viewer={viewer} /> : null}
          </div>

          {chatId !== null ? <ChatThread matchId={chatId} onBack={() => setChatId(null)} /> : null}

          {profileKey ? (
            <div className="absolute inset-0 z-40 bg-background">
              <button
                type="button"
                onClick={() => (setProfileKey(null), setSharedPost(undefined))}
                aria-label="Volver"
                className="absolute left-4 top-16 z-20 flex size-9 items-center justify-center rounded-full bg-secondary"
              >
                <ArrowLeft className="size-4" />
              </button>
              <AthleteProfileView profileKey={profileKey} initialPost={sharedPost} />
            </div>
          ) : null}

          <nav aria-label="Secciones" className="absolute inset-x-0 bottom-0 z-30 border-t md:hidden border-border bg-background/90 px-3 pb-4 pt-2 backdrop-blur">
            <ul className={cn('flex items-end', isGuest ? 'justify-around' : 'justify-between')}>
              {visibleTabs.map(({ id, label, icon: Icon }) => {
                const active = tab === id && !profileKey
                const isMatch = id === 'match'
                return (
                  <li key={id} className="flex-1">
                    <button
                      type="button"
                      onClick={() => goTo(id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn('flex w-full flex-col items-center gap-1 text-[11px] font-semibold transition-colors', active ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      {id === 'perfil' ? (
                        <>
                          <MeAvatar src={mePhoto} name={meName} active={active} className="size-6" />
                          <span className="max-w-16 truncate">{meName}</span>
                        </>
                      ) : isMatch ? (
                        <span
                          className={cn(
                            '-mt-6 flex size-14 items-center justify-center rounded-2xl shadow-lg transition-colors',
                            active ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground',
                          )}
                        >
                          <Icon className="size-6" />
                        </span>
                      ) : (
                        <Icon className="size-6" />
                      )}
                      {id === 'perfil' ? null : label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <NotificationBanner />
          {showNotifications ? <NotificationsPanel onClose={() => setShowNotifications(false)} /> : null}
          {showSettings ? <SettingsPanel initialPage={showSettings === true ? undefined : showSettings} onClose={() => setShowSettings(false)} /> : null}
          <ApplyPreferences enabled={!isGuest} />
          {tutorialOpen && !isGuest ? (
            <Tutorial role={viewer.role as 'deportista' | 'empresa' | 'evento'} name={viewer.name} onDone={closeTutorial} onOpenSettings={() => openSettingsPanel()} />
          ) : null}
          {askAccount ? (
            <Sheet title="Creá tu cuenta" onClose={() => setAskAccount(false)}>
              <div className="flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Como invitado podés mirar logros y el feed. Para dar likes, apoyar, comentar o postularte a marcas necesitás una cuenta.
                </p>
                <button type="button" onClick={signOut} className="rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white">
                  Crear cuenta o ingresar
                </button>
              </div>
            </Sheet>
          ) : null}
        </div>
        </div>
      </main>
    </NavContext.Provider>
  )
}
