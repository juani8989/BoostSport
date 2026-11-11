'use client'

import { useEffect } from 'react'
import { preload } from 'swr'
import { getDeck, getMatches } from '@/app/actions/match'
import { getCompanerosFeed, getEventsState } from '@/app/actions/social'
import { listBrands, searchPeople } from '@/app/actions/org'
import { getAthleteProfile } from '@/app/actions/athlete'
import type { Viewer } from '@/components/app-shell'
import { load } from '@/lib/load'

const warmImages = new Set<string>()

/** Starts downloading images in the background so they show instantly later. */
export function warmImage(src?: string | null) {
  if (!src || warmImages.has(src) || typeof window === 'undefined') return
  warmImages.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}

function whenIdle(fn: () => void) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout: 2000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 300)
  return () => clearTimeout(id)
}

/**
 * Loads the data of every tab while the user looks at the first one, so switching tabs
 * renders from cache. Keys and fetchers must match the useSWR calls in each screen.
 */
export function usePrefetchTabs(role: Viewer['role']) {
  useEffect(
    () =>
      whenIdle(() => {
        preload('events-state', () => load('getEventsState'))
        preload('companeros', () => load('getCompanerosFeed'))
        if (role === 'invitado') return

        preload('matches', () => load('getMatches'))
        preload('deck', () => load('getDeck')).then((cards) => cards.slice(0, 6).forEach((c) => warmImage(c.party.image)))
        if (role === 'deportista') preload(['athlete', 'me'], () => load('getAthleteProfile', 'me'))
        if (role === 'evento') {
          preload(['event-athletes', ''], ([, q]) => load('searchPeople', q, 'deportista'))
          preload(['event-brands', ''], ([, q]) => load('listBrands', q))
        }
      }),
    [role],
  )
}
