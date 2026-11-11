'use client'

import { useRef, useState } from 'react'
import { useNav } from '@/components/app/nav'
import { CompanerosFeed } from '@/components/home/companeros-feed'
import { EmpresasFeed } from '@/components/home/empresas-feed'
import { EventosFeed } from '@/components/home/eventos-feed'
import { EventAthletesFeed } from '@/components/event/event-athletes-feed'
import { EventBrandsFeed } from '@/components/event/event-brands-feed'
import { cn } from '@/lib/utils'
import { FeedArrows } from '@/components/app/feed-arrows'

type Segment = 'companeros' | 'empresas' | 'eventos' | 'deportistas' | 'marcas'

const labels: Record<Segment, string> = {
  companeros: 'Compañeros',
  empresas: 'Sponsors',
  eventos: 'Eventos',
  deportistas: 'Deportistas',
  marcas: 'Marcas',
}
const activeColor: Record<Segment, string> = {
  companeros: 'bg-olympic-blue text-olympic-white',
  empresas: 'bg-olympic-yellow text-olympic-black',
  eventos: 'bg-olympic-green text-olympic-white',
  deportistas: 'bg-olympic-blue text-olympic-white',
  marcas: 'bg-olympic-yellow text-olympic-black',
}

function segmentsFor(role: string): Segment[] {
  if (role === 'deportista') return ['companeros', 'empresas', 'eventos']
  if (role === 'evento') return ['deportistas', 'marcas']
  return ['companeros', 'eventos']
}

export function HomeFeed() {
  const { role } = useNav()
  const segments = segmentsFor(role)
  const [segment, setSegment] = useState<Segment>(segments[0])
  const isEventList = segment === 'deportistas' || segment === 'marcas'
  const scroller = useRef<HTMLDivElement>(null)

  return (
    <div className="relative h-full">
      <div role="tablist" aria-label="Secciones del inicio" className="absolute inset-x-0 top-16 z-20 flex justify-center gap-1.5 px-4">
        {segments.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={segment === s}
            onClick={() => setSegment(s)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur transition-colors',
              segment === s ? activeColor[s] : 'bg-background/60 text-muted-foreground',
            )}
          >
            {labels[s]}
          </button>
        ))}
      </div>
      {isEventList ? (
        <div key={segment} className="h-full overflow-y-auto px-4 pb-28 pt-28 [scrollbar-width:none]">
          {segment === 'deportistas' ? <EventAthletesFeed /> : <EventBrandsFeed />}
        </div>
      ) : (
        <>
          <div ref={scroller} key={segment} className="h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none]">
            {segment === 'companeros' ? <CompanerosFeed /> : segment === 'empresas' ? <EmpresasFeed /> : <EventosFeed />}
          </div>
          <FeedArrows key={`arrows-${segment}`} target={scroller} className="right-4 top-44" />
        </>
      )}
    </div>
  )
}
