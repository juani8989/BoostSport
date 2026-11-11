'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { mutate as globalMutate } from 'swr'
import {
  AtSign,
  Ban,
  BellOff,
  Bot,
  CalendarPlus,
  Eye,
  Handshake,
  MessageCircle,
  MessageSquareOff,
  Search,
  ShieldAlert,
  UserRoundX,
  Users,
  X,
} from 'lucide-react'
import { getKnownPeople, getPeople } from '@/app/actions/settings'
import type { Audience, ProposalAudience } from '@/lib/settings'
import { PartyAvatar } from '@/components/app/kit'
import { useSettings } from '@/components/settings/use-settings'
import { Choice, Empty, Intro, Loading, Page, Section, Toggle, inputClass } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'
import { load } from '@/lib/load'

export function VisibilityPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const p = settings.privacy
  return (
    <Page title="Match y búsquedas" onBack={back}>
      <Intro icon={Search} title="Quién te puede encontrar">
        Elegí si aparecés cuando marcas, deportistas e instituciones buscan con quién trabajar.
      </Intro>
      <Section>
        <Toggle icon={Handshake} label="Aparecer en Match" hint="Tu tarjeta se muestra en el mazo de Match de otros usuarios." checked={p.showInMatch} onChange={(v) => update({ privacy: { showInMatch: v } }).then(() => globalMutate('deck'))} />
        <Toggle icon={Search} label="Aparecer en búsquedas" hint="Sponsors e instituciones te encuentran por nombre o disciplina." checked={p.showInSearch} onChange={(v) => update({ privacy: { showInSearch: v } })} />
        <Toggle icon={Bot} label="Aparecer en el scout con IA" hint="La IA puede recomendarte cuando una marca describe lo que busca." checked={p.showInAiScout} onChange={(v) => update({ privacy: { showInAiScout: v } })} />
      </Section>
    </Page>
  )
}

const audienceOptions: { value: Audience; label: string; hint?: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'seguidos', label: 'Solo personas que sigo' },
  { value: 'nadie', label: 'Nadie' },
]

export function AudiencePage({ back, field }: PageProps & { field: 'messages' | 'comments' | 'mentions' | 'eventInvites' }) {
  const { settings, update } = useSettings()
  const meta = {
    messages: { title: 'Mensajes', icon: MessageCircle, intro: 'Quién puede escribirte en un chat abierto después de un match o una invitación.' },
    comments: { title: 'Comentarios', icon: MessageSquareOff, intro: 'Quién puede comentar tus publicaciones de Compañeros.' },
    mentions: { title: 'Menciones y etiquetas', icon: AtSign, intro: 'Quién puede mencionarte o etiquetarte en publicaciones y comentarios.' },
    eventInvites: { title: 'Invitaciones a eventos', icon: CalendarPlus, intro: 'Qué instituciones pueden invitarte a sus competencias.' },
  }[field]
  return (
    <Page title={meta.title} onBack={back}>
      <Intro icon={meta.icon} title={meta.title}>
        {meta.intro}
      </Intro>
      <Section>
        <Choice name={meta.title} value={settings.interactions[field]} options={audienceOptions} onChange={(v) => update({ interactions: { [field]: v } })} />
      </Section>
    </Page>
  )
}

const proposalOptions: { value: ProposalAudience; label: string; hint: string }[] = [
  { value: 'todas', label: 'De todas las marcas e instituciones', hint: 'Recibís todas las propuestas de sponsoreo.' },
  { value: 'verificadas', label: 'Solo de cuentas verificadas', hint: 'Filtrá propuestas de cuentas sin verificar.' },
  { value: 'ninguna', label: 'No recibir propuestas por ahora', hint: 'Útil si ya tenés sponsor y no buscás más.' },
]

export function ProposalsPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  return (
    <Page title="Propuestas de sponsoreo" onBack={back}>
      <Intro icon={Handshake} title="Tus propuestas">
        Elegí de quién querés recibir ofertas de producto, dinero o embajadas.
      </Intro>
      <Section>
        <Choice name="Propuestas" value={settings.interactions.proposals} options={proposalOptions} onChange={(v) => update({ interactions: { proposals: v } })} />
      </Section>
    </Page>
  )
}

export function HiddenWordsPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const [word, setWord] = useState('')
  const words = settings.interactions.hiddenWords

  function add(e: React.FormEvent) {
    e.preventDefault()
    const w = word.trim().toLowerCase()
    if (!w || words.includes(w)) return setWord('')
    update({ interactions: { hiddenWords: [...words, w] } })
    setWord('')
  }

  return (
    <Page title="Palabras ocultas" onBack={back}>
      <Section hint="Los comentarios con estas palabras se ocultan en tus publicaciones. Quien los escribió los sigue viendo.">
        <Toggle icon={ShieldAlert} label="Ocultar comentarios ofensivos" checked={settings.interactions.hideOffensive} onChange={(v) => update({ interactions: { hideOffensive: v } })} />
      </Section>
      <Section title="Tus palabras y frases">
        <form onSubmit={add} className="flex gap-2 px-4 py-2">
          <label htmlFor="hidden-word" className="sr-only">
            Agregar palabra
          </label>
          <input id="hidden-word" value={word} onChange={(e) => setWord(e.target.value)} maxLength={40} placeholder="Agregá una palabra o frase" className={inputClass} />
          <button type="submit" className="shrink-0 rounded-xl bg-olympic-blue px-4 text-sm font-bold text-olympic-white">
            Agregar
          </button>
        </form>
        {words.length ? (
          <ul className="flex flex-wrap gap-2 px-4 py-2">
            {words.map((w) => (
              <li key={w} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm">
                {w}
                <button type="button" aria-label={`Quitar ${w}`} onClick={() => update({ interactions: { hiddenWords: words.filter((x) => x !== w) } })} className="flex size-6 items-center justify-center rounded-full hover:bg-background">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-2 text-sm text-muted-foreground">Todavía no agregaste palabras.</p>
        )}
      </Section>
    </Page>
  )
}

export function LimitsPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  return (
    <Page title="Límites" onBack={back}>
      <Intro icon={ShieldAlert} title="Tomate un respiro">
        Si recibís mucha atención de golpe —por ejemplo después de un resultado— limitá temporalmente quién puede interactuar con vos.
      </Intro>
      <Section>
        <Toggle label="Limitar cuentas nuevas" hint="Las cuentas creadas en la última semana no pueden comentar ni escribirte." checked={settings.interactions.limitNewAccounts} onChange={(v) => update({ interactions: { limitNewAccounts: v } })} />
        <Toggle
          label="Solo personas que sigo"
          hint="Comentarios y mensajes solo de quienes seguís."
          checked={settings.interactions.comments === 'seguidos' && settings.interactions.messages === 'seguidos'}
          onChange={(v) => update({ interactions: v ? { comments: 'seguidos', messages: 'seguidos' } : { comments: 'todos', messages: 'todos' } })}
        />
      </Section>
    </Page>
  )
}

const listMeta = {
  blocked: {
    title: 'Cuentas bloqueadas',
    icon: Ban,
    intro: 'No ven tus publicaciones, no aparecen en tu Match ni en tus búsquedas y no pueden escribirte ni comentarte. No les avisamos.',
    action: 'Bloquear',
    undo: 'Desbloquear',
  },
  muted: {
    title: 'Cuentas silenciadas',
    icon: BellOff,
    intro: 'Dejás de ver sus publicaciones y comentarios sin dejar de seguirlas. No se enteran.',
    action: 'Silenciar',
    undo: 'Dejar de silenciar',
  },
  restricted: {
    title: 'Cuentas restringidas',
    icon: UserRoundX,
    intro: 'Sus comentarios en tus publicaciones solo los ven ellos. No se enteran de que los restringiste.',
    action: 'Restringir',
    undo: 'Quitar restricción',
  },
} as const

export function PeopleListPage({ back, list }: PageProps & { list: keyof typeof listMeta }) {
  const meta = listMeta[list]
  const { settings, setMember } = useSettings()
  const keys = settings[list]
  const { data: people, isLoading } = useSWR(['people', ...keys], () => load('getPeople', keys))
  const { data: known } = useSWR('known-people', () => load('getKnownPeople'))
  const [query, setQuery] = useState('')
  const candidates = (known ?? []).filter((p) => !keys.includes(p.key) && p.name.toLowerCase().includes(query.toLowerCase()))

  async function toggle(key: string, on: boolean) {
    await setMember(list, key, on)
    globalMutate('companeros')
    globalMutate('deck')
  }

  return (
    <Page title={meta.title} onBack={back}>
      <Intro icon={meta.icon} title={meta.title}>
        {meta.intro}
      </Intro>
      <Section title={`${keys.length} ${keys.length === 1 ? 'cuenta' : 'cuentas'}`}>
        {isLoading && keys.length ? <Loading /> : null}
        {!keys.length ? <p className="px-4 py-2 text-sm text-muted-foreground">No hay cuentas en esta lista.</p> : null}
        <ul>
          {people?.map((p) => (
            <li key={p.key} className="flex items-center gap-3 px-4 py-2.5">
              <PartyAvatar party={p} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{p.name}</span>
                <span className="truncate text-xs text-muted-foreground">{p.subtitle}</span>
              </span>
              <button type="button" onClick={() => toggle(p.key, false)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold">
                {meta.undo}
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Agregar desde tus contactos">
        <div className="px-4 py-2">
          <label htmlFor={`search-${list}`} className="sr-only">
            Buscar
          </label>
          <input id={`search-${list}`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre" className={inputClass} />
        </div>
        {known && !candidates.length ? (
          <Empty icon={Users} title="Sin resultados">Acá aparecen las personas que seguís, tus seguidores y tus matches.</Empty>
        ) : null}
        <ul>
          {candidates.slice(0, 30).map((p) => (
            <li key={p.key} className="flex items-center gap-3 px-4 py-2.5">
              <PartyAvatar party={p} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{p.name}</span>
                <span className="truncate text-xs text-muted-foreground">{p.subtitle}</span>
              </span>
              <button type="button" onClick={() => toggle(p.key, true)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${list === 'blocked' ? 'bg-destructive text-white' : 'bg-foreground text-background'}`}>
                {meta.action}
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  )
}
