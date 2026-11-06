'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Accessibility,
  Archive,
  AtSign,
  Ban,
  BarChart3,
  BadgeCheck,
  Bell,
  BellOff,
  Bookmark,
  CalendarPlus,
  Download,
  Eye,
  Gauge,
  Handshake,
  HelpCircle,
  History,
  Info,
  Languages,
  LogOut,
  MessageCircle,
  MessageSquareOff,
  Moon,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  MonitorSmartphone,
  UserPlus,
  UserRoundX,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/lib/auth-store'
import { PartyAvatar } from '@/components/app/kit'
import { useSettings } from '@/components/settings/use-settings'
import { Row, Section } from '@/components/settings/ui'
import type { PageId, PageProps } from '@/components/settings/types'
import { AccountCenter, DeletePage, DownloadPage, PasswordPage, PersonalData, SessionsPage, VerificationPage } from '@/components/settings/pages/account'
import { ActivityPage, ArchivePage, SavedPage } from '@/components/settings/pages/content'
import { NotificationsPage } from '@/components/settings/pages/notifications'
import { AudiencePage, HiddenWordsPage, LimitsPage, PeopleListPage, ProposalsPage, VisibilityPage } from '@/components/settings/pages/privacy'
import { AccessibilityPage, DataUsagePage, InterestsPage, LanguagePage, ThemePage, WhatYouSeePage } from '@/components/settings/pages/display'
import { BillingPage, PaymentsPage, StatsPage, ToolsPage } from '@/components/settings/pages/pro'
import { AccountStatusPage, HelpPage, InfoPage } from '@/components/settings/pages/support'
import type { Settings } from '@/lib/settings'

const audienceLabel = { todos: 'Todos', seguidos: 'Personas que sigo', nadie: 'Nadie' } as const
const themeLabel = { oscuro: 'Oscuro', claro: 'Claro', sistema: 'Del sistema' } as const
const languageLabel = { es: 'Español', en: 'English', pt: 'Português' } as const
const proposalLabel = { todas: 'Todas', verificadas: 'Verificadas', ninguna: 'Ninguna' } as const

type Item = { id: PageId; label: string; icon: LucideIcon; keywords: string; value?: (s: Settings) => string | undefined; badge?: (s: Settings) => number }
type Group = { title: string; items: Item[] }

const GROUPS: Group[] = [
  {
    title: 'Cómo usás BoostSport',
    items: [
      { id: 'guardados', label: 'Guardados', icon: Bookmark, keywords: 'guardar marcadores colecciones' },
      { id: 'archivo', label: 'Archivo', icon: Archive, keywords: 'archivar ocultar publicaciones', value: (s) => (s.archived.length ? String(s.archived.length) : undefined) },
      { id: 'actividad', label: 'Tu actividad', icon: History, keywords: 'me gusta comentarios historial seguidos interacciones' },
      { id: 'notificaciones', label: 'Notificaciones', icon: Bell, keywords: 'avisos push email alertas silencio', value: (s) => (s.notifications.pauseAll ? 'En pausa' : undefined) },
    ],
  },
  {
    title: 'Quién puede ver tu contenido',
    items: [
      { id: 'visibilidad', label: 'Match y búsquedas', icon: Eye, keywords: 'aparecer buscar scout ia match visibilidad', value: (s) => (s.privacy.showInMatch ? 'Visible' : 'Oculto') },
      { id: 'bloqueadas', label: 'Cuentas bloqueadas', icon: Ban, keywords: 'bloquear', value: (s) => String(s.blocked.length) },
    ],
  },
  {
    title: 'Cómo pueden interactuar contigo',
    items: [
      { id: 'mensajes', label: 'Mensajes', icon: MessageCircle, keywords: 'chat escribir mensajes directos', value: (s) => audienceLabel[s.interactions.messages] },
      { id: 'comentarios', label: 'Comentarios', icon: MessageSquareOff, keywords: 'comentar', value: (s) => audienceLabel[s.interactions.comments] },
      { id: 'menciones', label: 'Menciones y etiquetas', icon: AtSign, keywords: 'mencionar etiquetar arroba', value: (s) => audienceLabel[s.interactions.mentions] },
      { id: 'propuestas', label: 'Propuestas de sponsoreo', icon: Handshake, keywords: 'ofertas sponsor marcas', value: (s) => proposalLabel[s.interactions.proposals] },
      { id: 'restringidas', label: 'Cuentas restringidas', icon: UserRoundX, keywords: 'restringir', value: (s) => String(s.restricted.length) },
      { id: 'palabras', label: 'Palabras ocultas', icon: ShieldAlert, keywords: 'ofensivo filtro insultos', value: (s) => (s.interactions.hiddenWords.length ? String(s.interactions.hiddenWords.length) : undefined) },
      { id: 'limites', label: 'Límites', icon: ShieldCheck, keywords: 'acoso cuentas nuevas limitar' },
    ],
  },
  {
    title: 'Qué ves',
    items: [
      { id: 'que-ves', label: 'Contenido y recuentos de me gusta', icon: Sparkles, keywords: 'feed sensible likes ocultar recuento' },
      { id: 'intereses', label: 'Disciplinas que te interesan', icon: UserPlus, keywords: 'deportes intereses sugerido', value: (s) => (s.feed.interests.length ? String(s.feed.interests.length) : 'Todas') },
      { id: 'silenciadas', label: 'Cuentas silenciadas', icon: BellOff, keywords: 'silenciar mute', value: (s) => String(s.muted.length) },
    ],
  },
  {
    title: 'Tu app y multimedia',
    items: [
      { id: 'tema', label: 'Tema', icon: Moon, keywords: 'oscuro claro modo noche apariencia', value: (s) => themeLabel[s.app.theme] },
      { id: 'accesibilidad', label: 'Accesibilidad', icon: Accessibility, keywords: 'texto tamaño contraste movimiento animaciones', value: (s) => (s.app.textSize !== 'normal' ? `Texto ${s.app.textSize}` : undefined) },
      { id: 'idioma', label: 'Idioma', icon: Languages, keywords: 'lenguaje english portugués', value: (s) => languageLabel[s.app.language] },
      { id: 'datos', label: 'Uso de datos y multimedia', icon: Gauge, keywords: 'ahorro datos calidad videos reproducción', value: (s) => (s.feed.dataSaver ? 'Ahorro' : undefined) },
    ],
  },
  {
    title: 'Para deportistas y marcas',
    items: [
      { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, keywords: 'métricas seguidores alcance insights números' },
      { id: 'herramientas', label: 'Herramientas', icon: Wrench, keywords: 'compartir link bio difundir' },
      { id: 'pagos', label: 'Pagos y acuerdos', icon: Wallet, keywords: 'cobros dinero propuestas contratos moneda' },
      { id: 'facturacion', label: 'Datos de facturación', icon: Receipt, keywords: 'cuit factura iva fiscal' },
      { id: 'verificacion', label: 'Verificación', icon: BadgeCheck, keywords: 'verificar identidad selfie perfil completo' },
    ],
  },
  {
    title: 'Más información y soporte',
    items: [
      { id: 'ayuda', label: 'Ayuda', icon: HelpCircle, keywords: 'soporte preguntas contacto problema reportar' },
      { id: 'estado', label: 'Estado de la cuenta', icon: ShieldCheck, keywords: 'restricciones reportes' },
      { id: 'informacion', label: 'Información', icon: Info, keywords: 'términos privacidad normas versión' },
    ],
  },
  {
    title: 'Tu información',
    items: [
      { id: 'descargar', label: 'Descargar tu información', icon: Download, keywords: 'exportar copia datos' },
      { id: 'sesiones', label: 'Dónde iniciaste sesión', icon: MonitorSmartphone, keywords: 'dispositivos sesiones seguridad' },
    ],
  },
]

function renderPage(id: PageId, props: PageProps) {
  switch (id) {
    case 'cuenta':
      return <AccountCenter {...props} />
    case 'datos-personales':
      return <PersonalData {...props} />
    case 'contrasena':
      return <PasswordPage {...props} />
    case 'sesiones':
      return <SessionsPage {...props} />
    case 'descargar':
      return <DownloadPage {...props} />
    case 'eliminar':
      return <DeletePage {...props} />
    case 'verificacion':
      return <VerificationPage {...props} />
    case 'guardados':
      return <SavedPage {...props} />
    case 'archivo':
      return <ArchivePage {...props} />
    case 'actividad':
      return <ActivityPage {...props} />
    case 'notificaciones':
      return <NotificationsPage {...props} />
    case 'visibilidad':
      return <VisibilityPage {...props} />
    case 'bloqueadas':
      return <PeopleListPage {...props} list="blocked" />
    case 'silenciadas':
      return <PeopleListPage {...props} list="muted" />
    case 'restringidas':
      return <PeopleListPage {...props} list="restricted" />
    case 'mensajes':
      return <AudiencePage {...props} field="messages" />
    case 'comentarios':
      return <AudiencePage {...props} field="comments" />
    case 'menciones':
      return <AudiencePage {...props} field="mentions" />
    case 'propuestas':
      return <ProposalsPage {...props} />
    case 'palabras':
      return <HiddenWordsPage {...props} />
    case 'limites':
      return <LimitsPage {...props} />
    case 'que-ves':
      return <WhatYouSeePage {...props} />
    case 'intereses':
      return <InterestsPage {...props} />
    case 'tema':
      return <ThemePage {...props} />
    case 'accesibilidad':
      return <AccessibilityPage {...props} />
    case 'idioma':
      return <LanguagePage {...props} />
    case 'datos':
      return <DataUsagePage {...props} />
    case 'estadisticas':
      return <StatsPage {...props} />
    case 'herramientas':
      return <ToolsPage {...props} />
    case 'pagos':
      return <PaymentsPage {...props} />
    case 'facturacion':
      return <BillingPage {...props} />
    case 'ayuda':
      return <HelpPage {...props} />
    case 'estado':
      return <AccountStatusPage {...props} />
    case 'informacion':
      return <InfoPage {...props} />
  }
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function SettingsPanel({ onClose, initialPage }: { onClose: () => void; initialPage?: PageId }) {
  const { settings, account } = useSettings()
  const [stack, setStack] = useState<PageId[]>(initialPage ? [initialPage] : [])
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (stack.length) setStack((s) => s.slice(0, -1))
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stack.length, onClose])

  const props: PageProps = {
    go: (id) => setStack((s) => [...s, id]),
    back: () => setStack((s) => s.slice(0, -1)),
    close: onClose,
  }

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return null
    return GROUPS.flatMap((g) => g.items).filter((i) => normalize(`${i.label} ${i.keywords}`).includes(q))
  }, [query])

  const current = stack[stack.length - 1]

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-background animate-in fade-in slide-in-from-right-8 duration-200 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-label="Configuración y actividad">
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 px-2 pb-2 pt-5">
          <button type="button" onClick={onClose} aria-label="Cerrar configuración" className="flex size-10 items-center justify-center rounded-full hover:bg-secondary">
            <X className="size-5" />
          </button>
          <h2 className="font-display text-lg font-semibold">Configuración y actividad</h2>
        </header>
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Buscar en configuración</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {query ? (
              <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')}>
                <X className="size-4 text-muted-foreground" />
              </button>
            ) : null}
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-10">
          {results ? (
            <Section title={results.length ? `${results.length} resultados` : 'Sin resultados'}>
              {results.map((i) => (
                <Row key={i.id} icon={i.icon} label={i.label} value={i.value?.(settings)} onClick={() => props.go(i.id)} />
              ))}
            </Section>
          ) : (
            <>
              <Section title="Tu cuenta">
                <button type="button" onClick={() => props.go('cuenta')} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60">
                  {account ? <PartyAvatar party={account.party} className="size-12" /> : <span className="size-12 rounded-full bg-secondary" />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">Centro de cuentas</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">Contraseña, seguridad, datos personales y sesiones</span>
                  </span>
                </button>
              </Section>
              {GROUPS.map((g) => (
                <Section key={g.title} title={g.title}>
                  {g.items.map((i) => (
                    <Row key={i.id} icon={i.icon} label={i.label} value={i.value?.(settings)} onClick={() => props.go(i.id)} />
                  ))}
                </Section>
              ))}
              <Section title="Inicio de sesión">
                <Row icon={UserPlus} label="Agregar cuenta" hint="Cerrás esta sesión y entrás con otra" onClick={signOut} />
                <Row icon={LogOut} label="Cerrar sesión" danger onClick={signOut} />
              </Section>
            </>
          )}
        </div>
      </div>

      {current ? renderPage(current, props) : null}
    </div>
  )
}
