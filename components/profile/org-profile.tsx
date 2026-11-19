'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { CalendarDays, Globe, Settings2, Handshake, MapPin, MessageCircle, Megaphone, Route, Search, ShieldCheck } from 'lucide-react'
import { getMatches } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { OrgProfileForm } from '@/components/profile/org-profile-form'
import { updateMyOrgProfile } from '@/app/actions/profile'
import type { OrgProfile } from '@/lib/profile-types'
import { AiScout } from '@/components/org/ai-scout'
import { PeopleSearch } from '@/components/org/people-search'
import type { Viewer } from '@/components/app-shell'
import { load } from '@/lib/load'
import { ChallengesSection, ShopSection, SponsoredSheet } from '@/components/profile/sponsor-tools'
import { FollowSheet } from '@/components/profile/follow-sheet'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2027-03-15" → "15 de marzo de 2027"; anything else is shown as written. */
function longDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  return m ? `${Number(m[3])} de ${MONTHS[Number(m[2]) - 1]} de ${m[1]}` : value
}

/** Short form for the stats row: "15 mar". Falls back to the text as written. */
function shortDate(value: string) {
  const m = /^(\d{1,2}) de ([a-záéíóú]+)/i.exec(longDate(value))
  return m ? `${m[1]} ${m[2].slice(0, 3).toLowerCase()}` : value
}

export function OrgProfileView({ viewer }: { viewer: Viewer }) {
  const nav = useNav()
  const router = useRouter()
  const { data: matches } = useSWR('matches', () => load('getMatches'))
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<'seguidores' | 'sponsoreados' | null>(null)
  const { data: followers } = useSWR(['follow-list', 'me', 'seguidores'], () => load('getFollowList', 'me', 'seguidores'))
  const profile = viewer.account?.profile
  if (!profile || profile.kind === 'deportista') return null

  async function save(next: OrgProfile) {
    setPending(true)
    setError(null)
    const res = await updateMyOrgProfile(next)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setEditing(false)
    router.refresh()
  }

  const isCompany = profile.kind === 'empresa'
  const dealMatches = matches?.filter((m) => m.dealStatus === 'aceptada') ?? []
  const deals = dealMatches.length
  const sponsored = profile.sponsored ?? []
  const merch = profile.merch ?? []
  const info = profile.eventInfo

  const followerCount = followers?.people.length ?? 0
  // Each number opens its list: followers, the athletes it backs, the chats.
  const stats: { label: string; value: number | string; onClick?: () => void }[] = isCompany
    ? [
        { label: 'Seguidores', value: followerCount, onClick: () => setList('seguidores') },
        { label: 'Sponsoreados', value: sponsored.length + dealMatches.filter((d) => !sponsored.some((s) => s.key === d.other.key)).length, onClick: () => setList('sponsoreados') },
        { label: 'Matches', value: matches?.length ?? 0, onClick: () => nav.goTo('mensajes') },
        { label: 'Productos', value: merch.length, onClick: () => document.getElementById('merch-title')?.scrollIntoView({ behavior: 'smooth' }) },
      ]
    : [
        { label: 'Seguidores', value: followerCount, onClick: () => setList('seguidores') },
        { label: 'Invitados', value: matches?.length ?? 0, onClick: () => nav.goTo('mensajes') },
        { label: 'Confirmados', value: deals },
        { label: 'Fecha', value: profile.eventDate ? shortDate(profile.eventDate) : '—' },
      ]
  // Skip the city when the venue already names it ("Monumento a la Bandera, Rosario").
  const venue = info?.place ?? ''
  const cityPart = profile.city && venue.toLowerCase().includes(profile.city.toLowerCase()) ? '' : profile.city
  const placeLine = [venue, [cityPart, profile.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 pb-28 pt-20 no-scrollbar">
      <section className="flex flex-col items-center gap-3 text-center">
        {profile.logo ? (
          <img loading="lazy" decoding="async" src={profile.logo || "/placeholder.svg"} alt={`Logo de ${profile.orgName}`} className="size-24 rounded-full object-cover ring-4 ring-olympic-yellow" />
        ) : (
          <PartyAvatar party={{ name: profile.orgName, initials: profile.orgName.slice(0, 2).toUpperCase(), role: profile.kind }} className="size-24 ring-4" />
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-balance font-display text-3xl font-semibold">{profile.orgName}</h1>
          <p className="text-sm text-muted-foreground">{profile.category}</p>
        </div>
        {profile.description ? <p className="text-pretty text-sm leading-relaxed">{profile.description}</p> : null}
        <dl className="grid w-full grid-cols-4 gap-1 rounded-2xl bg-card p-2">
          {stats.map((s) =>
            s.onClick ? (
              <button key={s.label} type="button" onClick={s.onClick} className="flex min-w-0 flex-col items-center rounded-xl py-1 transition-colors hover:bg-secondary">
                <dd className="max-w-full truncate font-display text-2xl font-semibold">{s.value}</dd>
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              </button>
            ) : (
              <div key={s.label} className="flex min-w-0 flex-col items-center py-1">
                <dd className="max-w-full truncate font-display text-2xl font-semibold">{s.value}</dd>
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              </div>
            ),
          )}
        </dl>
        <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-sm font-bold">
          <Settings2 className="size-4" />
          Editar perfil
        </button>
      </section>

      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-3 rounded-xl bg-card p-3">
          <MapPin className="size-4 shrink-0 text-olympic-red" aria-hidden />
          {placeLine}
        </li>
        {profile.eventDate ? (
          <li className="flex items-center gap-3 rounded-xl bg-card p-3">
            <CalendarDays className="size-4 shrink-0 text-olympic-green" aria-hidden />
            {longDate(profile.eventDate)}
          </li>
        ) : null}
        {info?.distance ? (
          <li className="flex items-center gap-3 rounded-xl bg-card p-3">
            <Route className="size-4 shrink-0 text-olympic-yellow" aria-hidden />
            {info.distance}
          </li>
        ) : null}
        {info?.requirements ? (
          <li className="flex items-start gap-3 rounded-xl bg-card p-3 leading-relaxed">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-olympic-blue" aria-hidden />
            <span>
              <strong className="font-semibold">Requisitos: </strong>
              {info.requirements}
            </span>
          </li>
        ) : null}
        {info?.signup ? (
          <li className="flex items-start gap-3 rounded-xl bg-card p-3 leading-relaxed">
            <Handshake className="mt-0.5 size-4 shrink-0 text-olympic-green" aria-hidden />
            <span>
              <strong className="font-semibold">Inscripción: </strong>
              {info.signup}
            </span>
          </li>
        ) : null}
        {info?.reach ? (
          <li className="flex items-start gap-3 rounded-xl bg-card p-3 leading-relaxed">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-olympic-red" aria-hidden />
            {info.reach}
          </li>
        ) : null}
        {profile.website ? (
          <li className="flex items-center gap-3 rounded-xl bg-card p-3">
            <Globe className="size-4 shrink-0 text-olympic-blue" aria-hidden />
            <span className="truncate">{profile.website}</span>
          </li>
        ) : null}
        {profile.lookingFor ? (
          <li className="flex items-start gap-3 rounded-xl bg-card p-3 leading-relaxed">
            <Search className="mt-0.5 size-4 shrink-0 text-olympic-yellow" aria-hidden />
            {profile.lookingFor}
          </li>
        ) : null}
      </ul>

      {isCompany && sponsored.length ? (
        <section aria-labelledby="sponsored-title" className="flex flex-col gap-3">
          <h2 id="sponsored-title" className="font-display text-xl font-semibold">
            Nuestros sponsoreados
          </h2>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {sponsored.map((s) => (
              <li key={s.key} className="w-32 shrink-0">
                <button type="button" onClick={() => nav.openProfile(s.key)} className="flex w-full flex-col gap-2 text-left">
                  <img loading="lazy" decoding="async" src={s.image || '/images/swimmer.webp'} alt={s.name} className="aspect-[3/4] w-full rounded-2xl object-cover" />
                  <span className="flex flex-col">
                    <span className="truncate text-sm font-bold">{s.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{s.discipline}</span>
                    <span className="text-[11px] text-olympic-yellow">Desde {s.since}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isCompany ? <ChallengesSection challenges={profile.challenges ?? []} /> : null}

      {isCompany ? <ShopSection merch={merch} /> : null}

      {isCompany ? <AiScout lookingFor={profile.lookingFor} /> : null}

      <PeopleSearch roles={isCompany ? ['deportista', 'evento'] : ['deportista', 'empresa']} />

      <div className="flex gap-2">
        <button type="button" onClick={() => nav.goTo('match')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olympic-green py-3 text-sm font-bold text-olympic-white">
          <Handshake className="size-4" />
          Match
        </button>
      </div>
      {list === 'seguidores' ? <FollowSheet profileKey="me" name={profile.orgName} initialTab="seguidores" onClose={() => setList(null)} /> : null}
      {list === 'sponsoreados' ? <SponsoredSheet sponsored={sponsored} deals={dealMatches} onClose={() => setList(null)} /> : null}
      {editing ? (
        <Sheet
          title="Editar perfil"
          onClose={() => setEditing(false)}
          action={
            <button type="submit" form="org-profile-form" disabled={pending} className="rounded-full bg-olympic-blue px-4 py-2 text-sm font-bold text-olympic-white disabled:opacity-60">
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          }
        >
          {error ? <p role="alert" className="mb-4 rounded-xl bg-destructive/15 px-4 py-3 text-sm text-destructive">{error}</p> : null}
          <OrgProfileForm formId="org-profile-form" hideSubmit initial={profile} pending={pending} error={error} onSubmit={save} />
        </Sheet>
      ) : null}
    </div>
  )
}
