'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CalendarDays, ClipboardList, Globe, Heart, Loader2, MapPin, Megaphone, Search, ShoppingBag, Sparkles, Users } from 'lucide-react'
import type { RealOrg } from '@/app/actions/orgs'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { ApplySheet } from '@/components/home/apply-sheet'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

const COVER = { empresa: '/images/brand-campaign.webp', evento: '/images/event-marathon.webp' } as const

/** "2026-12-05" → "5 de diciembre de 2026"; anything else is shown as written. */
function niceDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return value
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const isImage = (src?: string) => !!src && /^(https:\/\/|\/|data:image\/)/.test(src)

function place(org: RealOrg) {
  const p = org.profile
  const venue = p.kind === 'evento' ? p.eventInfo?.place : ''
  // Skip the city when the venue already names it ("Monumento a la Bandera, Rosario").
  const city = p.city && venue?.toLowerCase().includes(p.city.toLowerCase()) ? '' : p.city
  return [venue, city, p.country].filter(Boolean).join(' · ')
}

/** The real sponsors or institutions; `undefined` while they load (an error counts as none). */
export function useRealOrgs(kind: 'empresa' | 'evento') {
  const { data, error } = useSWR(['real-orgs', kind], () => load('getRealOrgs', kind))
  return error ? [] : data
}

/** A full-screen card in the Inicio feed for a real sponsor or event. */
export function RealOrgSlide({ org, eager }: { org: RealOrg; eager?: boolean }) {
  const [open, setOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const nav = useNav()
  const p = org.profile
  const isEvent = p.kind === 'evento'
  const canApply = nav.role === 'deportista' || nav.role === 'invitado'

  return (
    <article className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={COVER[p.kind]} alt="" loading={eager ? 'eager' : 'lazy'} className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/30" />
      <div className="relative flex h-full flex-col justify-end gap-4 overflow-y-auto px-4 pb-24 pt-36 md:mx-auto md:max-w-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', isEvent ? 'bg-olympic-green text-olympic-white' : 'bg-olympic-yellow text-olympic-black')}>
            {p.category || (isEvent ? 'Evento' : 'Sponsor')}
          </span>
          {org.affinity !== null ? (
            <span className="flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
              <Sparkles className="size-3 text-olympic-yellow" /> {org.affinity}% afinidad
            </span>
          ) : null}
        </div>
        <header className="flex items-center gap-3">
          <PartyAvatar party={{ ...org.party, image: isImage(p.logo) ? p.logo : undefined }} className="size-12 text-base" />
          <h2 className="min-w-0 font-display text-3xl font-semibold leading-none text-balance">{org.party.name}</h2>
        </header>
        {isEvent && p.eventDate ? (
          <span className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-olympic-yellow" />
            {niceDate(p.eventDate)}
          </span>
        ) : null}
        {place(org) ? (
          <span className="-mt-2 flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-olympic-red" />
            {place(org)}
          </span>
        ) : null}
        {p.description ? <p className="line-clamp-3 text-pretty text-sm leading-relaxed text-muted-foreground">{p.description}</p> : null}
        {p.lookingFor ? (
          <div className="flex flex-col gap-1 rounded-xl bg-background/70 p-3 backdrop-blur">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Search className="size-3.5 text-olympic-blue" /> {isEvent ? 'A quién buscan' : 'Qué buscan'}
            </span>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{p.lookingFor}</p>
          </div>
        ) : null}
        <div className="flex gap-2">
          {canApply ? (
            <button type="button" onClick={() => nav.requireAccount() && setApplying(true)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olympic-blue px-4 py-3 text-sm font-bold text-olympic-white">
              <Heart className="size-4" />
              {isEvent ? 'Quiero participar' : 'Quiero ser su cara'}
            </button>
          ) : null}
          <button type="button" onClick={() => setOpen(true)} className={cn('flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-bold', !canApply && 'flex-1')}>
            Ver más
          </button>
        </div>
      </div>
      {open ? <RealOrgSheet org={org} onClose={() => setOpen(false)} /> : null}
      {applying ? <ApplySheet company={{ key: org.key, name: org.party.name }} onClose={() => setApplying(false)} /> : null}
    </article>
  )
}

/** The full page of a real sponsor or institution. */
export function RealOrgSheet({ org, onClose }: { org: RealOrg; onClose: () => void }) {
  const nav = useNav()
  const [applying, setApplying] = useState(false)
  const p = org.profile
  const isEvent = p.kind === 'evento'
  const canApply = nav.role === 'deportista' || nav.role === 'invitado'
  const info = isEvent ? p.eventInfo : undefined

  return (
    <Sheet title={org.party.name} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <PartyAvatar party={{ ...org.party, image: isImage(p.logo) ? p.logo : undefined }} className="size-14 text-lg" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-display text-2xl font-semibold">{org.party.name}</span>
            <span className="text-sm text-muted-foreground">{p.category || (isEvent ? 'Evento' : 'Sponsor')}</span>
            {org.affinity !== null ? <span className="mt-1 text-xs font-bold text-olympic-yellow">{org.affinity}% de afinidad con vos</span> : null}
          </div>
        </header>
        {p.description ? <p className="text-pretty text-sm leading-relaxed">{p.description}</p> : null}
        <ul className="flex flex-col gap-2 text-sm">
          {isEvent && p.eventDate ? <Row icon={<CalendarDays className="size-4 text-olympic-yellow" />}>{niceDate(p.eventDate)}</Row> : null}
          {place(org) ? <Row icon={<MapPin className="size-4 text-olympic-red" />}>{place(org)}</Row> : null}
          {info?.distance ? <Row icon={<Users className="size-4 text-olympic-blue" />}>{info.distance}</Row> : null}
          {p.website ? (
            <Row icon={<Globe className="size-4 text-muted-foreground" />}>
              <a href={/^https?:\/\//.test(p.website) ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {p.website.replace(/^https?:\/\//, '')}
              </a>
            </Row>
          ) : null}
        </ul>
        {p.lookingFor ? <Block icon={<Search className="size-4 text-olympic-blue" />} title={isEvent ? 'A quién buscan' : 'Qué buscan'} text={p.lookingFor} /> : null}
        {info?.requirements ? <Block icon={<ClipboardList className="size-4 text-olympic-green" />} title="Requisitos" text={info.requirements} /> : null}
        {info?.signup ? <Block icon={<ClipboardList className="size-4 text-olympic-blue" />} title="Inscripción" text={info.signup} /> : null}
        {info?.reach ? <Block icon={<Megaphone className="size-4 text-olympic-yellow" />} title="Repercusión" text={info.reach} /> : null}
        {p.merch?.length ? (
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <ShoppingBag className="size-4 text-olympic-yellow" /> Tienda
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {p.merch.map((m) => (
                <li key={m.name} className="flex flex-col gap-1 rounded-xl bg-card p-3 text-sm">
                  {isImage(m.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center rounded-lg bg-secondary">
                      <ShoppingBag className="size-6 text-muted-foreground" />
                    </span>
                  )}
                  <span className="font-semibold leading-snug">{m.name}</span>
                  {m.price ? <span className="text-xs text-muted-foreground">{m.price}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {canApply ? (
          <button type="button" onClick={() => nav.requireAccount() && setApplying(true)} className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white">
            <Heart className="size-4" />
            {isEvent ? 'Quiero participar' : 'Quiero ser su cara'}
          </button>
        ) : null}
      </div>
      {applying ? <ApplySheet company={{ key: org.key, name: org.party.name }} onClose={() => setApplying(false)} /> : null}
    </Sheet>
  )
}

/** Opens a real organization's page from just its key (the search knows only that). */
export function RealOrgSheetByKey({ orgKey, onClose }: { orgKey: string; onClose: () => void }) {
  const { data, isLoading } = useSWR(['real-org', orgKey], () => load('getRealOrg', orgKey))
  if (data) return <RealOrgSheet org={data} onClose={onClose} />
  return (
    <Sheet title="Cargando" onClose={onClose}>
      <div className="flex justify-center py-10">
        {isLoading ? <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando" /> : <p className="text-sm text-muted-foreground">No encontramos esta cuenta.</p>}
      </div>
    </Sheet>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}

function Block({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-xl bg-card p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </section>
  )
}
