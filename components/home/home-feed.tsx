'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useNav } from '@/components/app/nav'
import { CompanerosFeed } from '@/components/home/companeros-feed'
import { VitrinaFeed } from '@/components/feed/vitrina-feed'
import { EmpresasFeed } from '@/components/home/empresas-feed'
import { EventosFeed } from '@/components/home/eventos-feed'
import { EventAthletesFeed } from '@/components/event/event-athletes-feed'
import { EventBrandsFeed } from '@/components/event/event-brands-feed'
import { cn } from '@/lib/utils'
import { FeedArrows } from '@/components/app/feed-arrows'
import { PullToRefresh } from '@/components/app/pull-to-refresh'

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

/** These buttons switch to Vitrina (and back) when tapped again. */
const togglesVitrina = (s: Segment) => s === 'companeros' || s === 'deportistas'

export function HomeFeed() {
  const { role } = useNav()
  const segments = segmentsFor(role)
  const [segment, setSegment] = useState<Segment>(segments[0])
  // Compañeros (or Deportistas) and Vitrina share one button: tapping it again switches between the two.
  const [vitrina, setVitrina] = useState(false)
  const showVitrina = vitrina && togglesVitrina(segment)
  const isEventList = !showVitrina && (segment === 'deportistas' || segment === 'marcas')
  const scroller = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const hint = useVitrinaHint(togglesVitrina(segment) && !showVitrina)
  // Brands aren't the athletes' teammates: for them the same feed is called Deportistas.
  const labelOf = (s: Segment) => (s === 'companeros' && role === 'empresa' ? 'Deportistas' : labels[s])

  return (
    <div className="relative h-full">
      <div role="tablist" aria-label="Secciones del inicio" className="absolute inset-x-0 top-16 z-20 flex justify-center gap-1.5 px-4">
        {segments.map((s) => {
          const current = segment === s
          const onVitrina = current && showVitrina
          return (
            // The bubble hangs from the button it talks about, so its arrow always points at it.
            <span key={s} className="relative">
            <button
              type="button"
              role="tab"
              aria-selected={current}
              aria-label={togglesVitrina(s) && current ? `${onVitrina ? 'Vitrina' : labelOf(s)}. Tocá de nuevo para ver ${onVitrina ? labelOf(s) : 'Vitrina'}` : undefined}
              onClick={() => {
                if (current && togglesVitrina(s)) {
                  setVitrina((v) => !v)
                  hint.dismiss()
                }
                else {
                  setSegment(s)
                  setVitrina(false)
                }
              }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur transition-colors',
                current ? (onVitrina ? 'bg-olympic-red text-olympic-white' : activeColor[s]) : 'bg-background/60 text-muted-foreground',
              )}
            >
              {onVitrina ? 'Vitrina' : labelOf(s)}
              {togglesVitrina(s) && current ? <ArrowLeftRight aria-hidden className="ml-1.5 inline size-3 align-[-1px] opacity-80" /> : null}
            </button>
            {hint.show && current && togglesVitrina(s) ? (
              <button
                type="button"
                onClick={() => {
                  setVitrina(true)
                  hint.dismiss()
                }}
                className="absolute left-0 top-full z-30 mt-2.5 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-olympic-red px-3 py-1.5 text-xs font-bold text-olympic-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-300"
              >
                <span aria-hidden className="absolute -top-1 left-7 size-2.5 rotate-45 bg-olympic-red" />
                Tocá de nuevo para ver la Vitrina
              </button>
            ) : null}
            </span>
          )
        })}
      </div>
      {isEventList ? (
        <div ref={list} key={segment} className={cn('h-full overflow-y-auto px-4 pb-28 [scrollbar-width:none] transition-[padding]', hint.show ? 'pt-36' : 'pt-28')}>
          {segment === 'deportistas' ? <EventAthletesFeed /> : <EventBrandsFeed />}
          <PullToRefresh key={`pull-${segment}`} target={list} />
        </div>
      ) : (
        <>
          <div ref={scroller} key={`${segment}-${showVitrina}`} className="h-full overscroll-y-contain snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none]">
            {showVitrina ? <VitrinaFeed /> : segment === 'companeros' ? <CompanerosFeed /> : segment === 'empresas' ? <EmpresasFeed /> : <EventosFeed />}
          </div>
          <FeedArrows key={`arrows-${segment}-${showVitrina}`} target={scroller} className="right-4 top-44" />
          <PullToRefresh key={`pull-${segment}-${showVitrina}`} target={scroller} />
        </>
      )}
    </div>
  )
}

const HINT_KEY = 'boostsport:hint-vitrina'

/** The first time, a bubble says the button can be tapped again; it goes away for good once used. */
function useVitrinaHint(eligible: boolean) {
  const [seen, setSeen] = useState(true)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(HINT_KEY) === '1')
    } catch {}
  }, [])
  useEffect(() => {
    if (seen || !eligible) return setVisible(false)
    // A moment after the feed shows, so it doesn't compete with the first post.
    const show = setTimeout(() => setVisible(true), 1500)
    const hide = setTimeout(() => setVisible(false), 9000)
    return () => (clearTimeout(show), clearTimeout(hide))
  }, [seen, eligible])
  const dismiss = () => {
    setSeen(true)
    setVisible(false)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {}
  }
  return { show: visible, dismiss }
}
