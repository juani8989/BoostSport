/** Everything a user can tune from Configuración. Stored as JSON in user_settings, merged over the defaults. */

export type Audience = 'todos' | 'seguidos' | 'nadie'
export type ProposalAudience = 'todas' | 'verificadas' | 'ninguna'
export type Theme = 'oscuro' | 'claro' | 'sistema'
export type TextSize = 'chico' | 'normal' | 'grande'
export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL'

export type NotificationKey =
  | 'likes'
  | 'comentarios'
  | 'seguidores'
  | 'mensajes'
  | 'matches'
  | 'propuestas'
  | 'eventos'
  | 'recordatorios'
  | 'novedades'

export type Settings = {
  privacy: {
    privateAccount: boolean
    showInMatch: boolean
    showInSearch: boolean
    showInAiScout: boolean
    showActivityStatus: boolean
    showFollowersCount: boolean
    showSocials: boolean
    showAge: boolean
    showSponsors: boolean
    allowSharing: boolean
  }
  interactions: {
    messages: Audience
    comments: Audience
    mentions: Audience
    proposals: ProposalAudience
    eventInvites: Audience
    hiddenWords: string[]
    hideOffensive: boolean
    limitNewAccounts: boolean
  }
  blocked: string[]
  muted: string[]
  restricted: string[]
  archived: string[]
  /** Folders for saved posts, as "id|name". */
  saveFolders: string[]
  /** Which saved post is in which folder, as "folderId|targetId". */
  savedIn: string[]
  /** Whether the welcome tutorial was finished or skipped. */
  tutorialSeen: boolean
  notifications: {
    /** When the person last opened the notifications; anything newer is unread. */
    lastReadAt: string
    pauseAll: boolean
    quietHours: { enabled: boolean; from: string; to: string }
    push: Record<NotificationKey, boolean>
    email: Record<NotificationKey, boolean>
  }
  feed: {
    hideLikeCounts: boolean
    sensitiveContent: 'menos' | 'estandar' | 'mas'
    interests: string[]
    autoplay: boolean
    dataSaver: boolean
  }
  app: {
    theme: Theme
    textSize: TextSize
    reduceMotion: boolean
    highContrast: boolean
    language: 'es' | 'en' | 'pt'
    timeLimitMinutes: number
  }
  payments: {
    currency: Currency
    billingName: string
    taxId: string
    taxCondition: string
    billingAddress: string
    billingEmail: string
    receipts: boolean
  }
}

const allOn = (on: boolean): Record<NotificationKey, boolean> => ({
  likes: on,
  comentarios: on,
  seguidores: on,
  mensajes: on,
  matches: on,
  propuestas: on,
  eventos: on,
  recordatorios: on,
  novedades: on,
})

export const DEFAULT_SETTINGS: Settings = {
  privacy: {
    privateAccount: false,
    showInMatch: true,
    showInSearch: true,
    showInAiScout: true,
    showActivityStatus: true,
    showFollowersCount: true,
    showSocials: true,
    showAge: true,
    showSponsors: true,
    allowSharing: true,
  },
  interactions: {
    messages: 'todos',
    comments: 'todos',
    mentions: 'todos',
    proposals: 'todas',
    eventInvites: 'todos',
    hiddenWords: [],
    hideOffensive: true,
    limitNewAccounts: false,
  },
  blocked: [],
  muted: [],
  restricted: [],
  archived: [],
  saveFolders: [],
  savedIn: [],
  tutorialSeen: false,
  notifications: {
    lastReadAt: '',
    pauseAll: false,
    quietHours: { enabled: false, from: '23:00', to: '07:00' },
    push: allOn(true),
    email: { ...allOn(false), mensajes: true, matches: true, propuestas: true, recordatorios: true },
  },
  feed: {
    hideLikeCounts: false,
    sensitiveContent: 'estandar',
    interests: [],
    autoplay: true,
    dataSaver: false,
  },
  app: {
    theme: 'oscuro',
    textSize: 'normal',
    reduceMotion: false,
    highContrast: false,
    language: 'es',
    timeLimitMinutes: 0,
  },
  payments: {
    currency: 'ARS',
    billingName: '',
    taxId: '',
    taxCondition: '',
    billingAddress: '',
    billingEmail: '',
    receipts: true,
  },
}

type Plain = Record<string, unknown>
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Deep-merges stored values over a template, keeping only known keys with the template's types. */
export function mergeSettings<T>(template: T, stored: unknown): T {
  if (!isPlain(template) || !isPlain(stored)) return template
  const out: Plain = { ...template }
  for (const [key, base] of Object.entries(template)) {
    const value = stored[key]
    if (value === undefined) continue
    if (isPlain(base)) out[key] = mergeSettings(base, value)
    else if (Array.isArray(base)) out[key] = Array.isArray(value) ? value.filter((v) => typeof v === 'string').slice(0, 500) : base
    else if (typeof value === typeof base) out[key] = typeof value === 'string' ? (value as string).slice(0, 300) : value
  }
  return out as T
}

export const NOTIFICATION_LABELS: Record<NotificationKey, { label: string; hint: string }> = {
  likes: { label: 'Me gusta y apoyos', hint: 'Cuando alguien da me gusta o apoya tus publicaciones.' },
  comentarios: { label: 'Comentarios', hint: 'Comentarios y respuestas en tus publicaciones.' },
  seguidores: { label: 'Seguidores', hint: 'Cuando alguien empieza a seguirte.' },
  mensajes: { label: 'Mensajes', hint: 'Mensajes nuevos en tus chats.' },
  matches: { label: 'Matches', hint: 'Cuando hacés match con un deportista, marca o institución.' },
  propuestas: { label: 'Propuestas de sponsoreo', hint: 'Ofertas nuevas, aceptadas o rechazadas.' },
  eventos: { label: 'Eventos', hint: 'Convocatorias, invitaciones y recordatorios de eventos.' },
  recordatorios: { label: 'Recordatorios de perfil', hint: 'Avisos para completar o actualizar tu perfil.' },
  novedades: { label: 'Novedades de BoostSport', hint: 'Funciones nuevas, consejos y encuestas.' },
}
