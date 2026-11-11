'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CalendarDays, Check, ClipboardList, Info, MapPin, Megaphone, Star, Users } from 'lucide-react'
import { events, seedAthleteKey, type SportEvent } from '@/lib/catalog'
import { athletes } from '@/lib/data'
import { getEventsState, toggleReaction } from '@/app/actions/social'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

export function EventosFeed() {
  const nav = useNav()
  const { data: state, mutate } = useSWR('events-state', () => load('getEventsState'))
  const [detail, setDetail] = useState<SportEvent | null>(null)

  async function toggleGoing(id: string) {
    if (!nav.requireAccount()) return
    mutate(
      (prev) => (prev ? { ...prev, [id]: { going: prev[id].going + (prev[id].mine ? -1 : 1), mine: !prev[id].mine } } : prev),
      { revalidate: false },
    )
    await toggleReaction(`event:${id}`, 'asistir')
    mutate()
  }

  return (
    <>
      {events.map((event, index) => {
        const s = state?.[event.id]
        return (
          <article key={event.id} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.image} alt="" loading={index > 1 ? 'lazy' : 'eager'} className="absolute inset-0 size-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />

            <div className="relative flex h-full flex-col justify-end gap-4 px-4 pb-24 pt-36">
              <span className="self-start rounded-full bg-olympic-green px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-olympic-white">{event.kind}</span>
              <h2 className="text-balance font-display text-4xl font-semibold leading-none">{event.name}</h2>
              <div className="flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-olympic-yellow" />
                  {event.date}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-olympic-red" />
                  {event.place}
                </span>
              </div>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{event.about}</p>

              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {event.attendees.map((id) => {
                    const a = athletes[id]
                    if (!a) return null
                    return (
                      <button key={id} type="button" onClick={() => nav.openProfile(seedAthleteKey(id))} aria-label={`Ver perfil de ${a.name}`}>
                        <PartyAvatar party={{ name: a.name, image: a.image, initials: a.name.slice(0, 2), role: 'deportista' }} className="size-8" />
                      </button>
                    )
                  })}
                </div>
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{s?.going ?? event.attendees.length}</span> deportistas de BoostSport van a ir
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {event.sponsors.map((sp) => (
                  <span key={sp} className="rounded-full border border-olympic-yellow/50 px-2.5 py-1 text-[11px] font-semibold text-olympic-yellow">
                    {sp}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleGoing(event.id)}
                  aria-pressed={s?.mine}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold',
                    s?.mine ? 'bg-olympic-green text-olympic-white' : 'bg-olympic-blue text-olympic-white',
                  )}
                >
                  {s?.mine ? <Check className="size-4" /> : <Users className="size-4" />}
                  {s?.mine ? 'Voy a ir' : 'Quiero ir'}
                </button>
                <button type="button" onClick={() => setDetail(event)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-bold">
                  <Info className="size-4" />
                  Detalles
                </button>
              </div>
            </div>
          </article>
        )
      })}
      {detail ? <EventDetail event={detail} onClose={() => setDetail(null)} /> : null}
    </>
  )
}

function EventDetail({ event, onClose }: { event: SportEvent; onClose: () => void }) {
  return (
    <Sheet title={event.name} onClose={onClose} tall>
      <div className="flex flex-col gap-5 text-sm">
        <Block icon={<ClipboardList className="size-4 text-olympic-blue" />} title="Cómo inscribirse">
          <p className="leading-relaxed">{event.howToRegister}</p>
          <span className={cn('self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold', event.registrationOpen ? 'bg-olympic-green text-olympic-white' : 'bg-secondary text-muted-foreground')}>
            {event.registrationOpen ? 'Inscripción abierta' : 'Por clasificación'}
          </span>
        </Block>
        <Block icon={<Check className="size-4 text-olympic-green" />} title="Qué necesitás">
          <ul className="flex flex-col gap-1 leading-relaxed">
            {event.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Block>
        <Block icon={<Star className="size-4 text-olympic-yellow" />} title="Figuras que estarán">
          <ul className="flex flex-col gap-1 leading-relaxed">
            {event.figures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Block>
        <Block icon={<Users className="size-4 text-olympic-blue" />} title="Empresas que colaboran">
          <p className="leading-relaxed">{event.sponsors.join(' · ')}</p>
        </Block>
        <Block icon={<MapPin className="size-4 text-olympic-red" />} title="Dónde y cuándo">
          <p className="leading-relaxed">
            {event.place} · {event.date}
          </p>
        </Block>
        <Block icon={<Megaphone className="size-4 text-olympic-green" />} title="Repercusión">
          <p className="leading-relaxed">{event.impact}</p>
        </Block>
      </div>
    </Sheet>
  )
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}
