'use client'

import useSWR from 'swr'
import { CalendarDays, Globe, Handshake, MapPin, MessageCircle, Megaphone, Route, Search, ShieldCheck } from 'lucide-react'
import { getMatches } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { AiScout } from '@/components/org/ai-scout'
import { PeopleSearch } from '@/components/org/people-search'
import type { Viewer } from '@/components/app-shell'

export function OrgProfileView({ viewer }: { viewer: Viewer }) {
  const nav = useNav()
  const { data: matches } = useSWR('matches', () => getMatches())
  const profile = viewer.account?.profile
  if (!profile || profile.kind === 'deportista') return null

  const isCompany = profile.kind === 'empresa'
  const deals = matches?.filter((m) => m.dealStatus === 'aceptada').length ?? 0
  const sponsored = profile.sponsored ?? []
  const merch = profile.merch ?? []
  const info = profile.eventInfo

  const stats = isCompany
    ? [
        { label: 'Sponsoreados', value: sponsored.length + deals },
        { label: 'Matches', value: matches?.length ?? 0 },
        { label: 'Productos', value: merch.length },
      ]
    : [
        { label: 'Invitados', value: matches?.length ?? 0 },
        { label: 'Confirmados', value: deals },
        { label: 'Fecha', value: profile.eventDate ?? '—' },
      ]

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
        <dl className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-card p-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <dd className="font-display text-2xl font-semibold">{s.value}</dd>
              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-3 rounded-xl bg-card p-3">
          <MapPin className="size-4 shrink-0 text-olympic-red" aria-hidden />
          {info?.place ? `${info.place} · ` : ''}
          {profile.city}, {profile.country}
        </li>
        {profile.eventDate ? (
          <li className="flex items-center gap-3 rounded-xl bg-card p-3">
            <CalendarDays className="size-4 shrink-0 text-olympic-green" aria-hidden />
            {profile.eventDate}
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

      {isCompany && merch.length ? (
        <section aria-labelledby="merch-title" className="flex flex-col gap-3">
          <h2 id="merch-title" className="font-display text-xl font-semibold">
            Tienda
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {merch.map((m) => (
              <li key={m.name} className="flex flex-col gap-2 rounded-2xl bg-card p-2">
                <img loading="lazy" decoding="async" src={m.image || '/placeholder.svg'} alt={m.name} className="aspect-square w-full rounded-xl object-cover" />
                <div className="flex flex-col px-1 pb-1">
                  <span className="text-sm font-semibold leading-tight">{m.name}</span>
                  <span className="font-display text-lg font-semibold text-olympic-green">{m.price}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isCompany ? <AiScout /> : null}

      <PeopleSearch roles={isCompany ? ['deportista', 'evento'] : ['deportista', 'empresa']} />

      <div className="flex gap-2">
        <button type="button" onClick={() => nav.goTo('match')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olympic-green py-3 text-sm font-bold text-olympic-white">
          <Handshake className="size-4" />
          Match
        </button>
        <button type="button" onClick={() => nav.goTo('mensajes')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olympic-blue py-3 text-sm font-bold text-olympic-white">
          <MessageCircle className="size-4" />
          Mensajes
        </button>
      </div>
    </div>
  )
}
