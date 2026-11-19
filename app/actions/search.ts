'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, user } from '@/lib/db/schema'
import { getViewer, partyFromProfile, userKey, type Party } from '@/lib/viewer'
import { companies, events, seedAthleteKey } from '@/lib/catalog'
import { athletes, vitrinaPosts } from '@/lib/data'
import type { AthleteProfile, OrgProfile, PressKind } from '@/lib/profile-types'
import { getSettingsMap, idFromKey } from '@/lib/user-settings'
import { getCompanerosFeed } from '@/app/actions/social'

export type SearchPerson = Party & { openable: boolean; about?: string }
export type SearchPost = { id: string; ownerKey: string; author: string; text: string; image: string | null; label: string }
export type SearchEvent = { id: string; name: string; kind: string; date: string; place: string; image: string }
export type SearchReference = { url: string; title: string; source: string; kind: PressKind; athleteKey: string; athleteName: string }

export type SearchResults = {
  people: SearchPerson[]
  posts: SearchPost[]
  events: SearchEvent[]
  references: SearchReference[]
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Every word of the query has to show up somewhere in the text. */
const matcher = (query: string) => {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  return (...parts: (string | undefined | null)[]) => {
    const text = normalize(parts.filter(Boolean).join(' '))
    return words.every((w) => text.includes(w))
  }
}

const LIMIT = 12

/** One search over people, posts (Compañeros and logros), torneos and references (press links). */
export async function searchEverything(rawQuery: string): Promise<SearchResults> {
  const query = String(rawQuery ?? '').slice(0, 80).trim()
  const empty: SearchResults = { people: [], posts: [], events: [], references: [] }
  if (!query) return empty
  const matches = matcher(query)

  const [viewer, rows, feed] = await Promise.all([
    getViewer(),
    db
      .select({ userId: profiles.userId, data: profiles.data, name: user.name })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .limit(300),
    getCompanerosFeed(),
  ])

  // Respect "Aparecer en búsquedas" and blocks in both directions.
  const settingsBy = await getSettingsMap([...rows.map((r) => r.userId), ...(viewer ? [viewer.id] : [])])
  const mine = viewer ? settingsBy.get(viewer.id) : undefined
  const hiddenKeys = new Set(mine?.blocked ?? [])
  const visible = rows.filter((r) => {
    if (r.userId === viewer?.id) return false
    const st = settingsBy.get(r.userId)
    if (st?.privacy.showInSearch === false) return false
    if (viewer && st?.blocked.includes(viewer.key)) return false
    return !hiddenKeys.has(userKey(r.userId))
  })

  const people: SearchPerson[] = []
  for (const a of Object.values(athletes)) {
    if (matches(a.name, a.handle, a.sport, a.city, a.category, a.level)) {
      people.push({ key: seedAthleteKey(a.id), name: a.name, role: 'deportista', subtitle: `${a.sport} · ${a.city}`, image: a.image, initials: a.name.slice(0, 2).toUpperCase(), openable: true })
    }
  }
  for (const c of companies) {
    if (matches(c.name, c.industry, c.about, c.sports.join(' '), c.lookingFor.join(' '))) {
      people.push({ key: c.key, name: c.name, role: 'empresa', subtitle: c.industry, image: c.image, initials: c.initials, openable: false, about: c.about })
    }
  }
  for (const r of visible) {
    const data = r.data as AthleteProfile | OrgProfile
    const party = partyFromProfile(userKey(r.userId), data, r.name)
    const text =
      data.kind === 'deportista'
        ? [party.name, (data.nicknames ?? []).join(' '), data.discipline, data.club, data.country, data.summary]
        : [party.name, data.category, data.city, data.country, data.description, data.lookingFor]
    if (matches(...text)) people.push({ ...party, openable: true })
  }

  const posts: SearchPost[] = []
  for (const p of feed) {
    if (matches(p.body, p.author.name)) {
      posts.push({ id: p.id, ownerKey: p.author.key, author: p.author.name, text: p.body, image: p.image, label: 'Compañeros' })
    }
  }
  for (const v of vitrinaPosts) {
    const a = athletes[v.athleteId]
    if (!a) continue
    const text = v.type === 'achievement' ? `${v.title} · ${v.event}` : v.type === 'stats' ? `${v.metric}: ${v.current}. ${v.summary}` : v.title
    const label = v.type === 'achievement' ? `Medalla de ${v.medal.toLowerCase()}` : v.type === 'stats' ? 'Estadísticas' : 'Top Secret'
    if (matches(text, a.name, a.sport)) posts.push({ id: v.id, ownerKey: seedAthleteKey(a.id), author: a.name, text, image: v.image, label })
  }

  const foundEvents: SearchEvent[] = events
    .filter((e) => matches(e.name, e.kind, e.place, e.date, e.about, e.sponsors.join(' '), e.figures.join(' ')))
    .map((e) => ({ id: e.id, name: e.name, kind: e.kind, date: e.date, place: e.place, image: e.image }))

  const references: SearchReference[] = []
  for (const r of visible) {
    const data = r.data as AthleteProfile | OrgProfile
    if (data.kind !== 'deportista') continue
    const name = partyFromProfile(userKey(r.userId), data, r.name).name
    for (const link of data.press ?? []) {
      if (matches(link.title, link.source, name)) {
        references.push({ url: link.url, title: link.title, source: link.source, kind: link.kind, athleteKey: userKey(r.userId), athleteName: name })
      }
    }
  }

  return {
    people: people.filter((p) => !idFromKey(p.key) || !hiddenKeys.has(p.key)).slice(0, LIMIT),
    posts: posts.slice(0, LIMIT),
    events: foundEvents.slice(0, LIMIT),
    references: references.filter((r) => /^https?:\/\//.test(r.url)).slice(0, LIMIT),
  }
}

export type SearchExplore = {
  /** People the viewer may want to follow or contact. */
  suggested: SearchPerson[]
  /** Most liked and supported posts right now. */
  popular: (SearchPost & { likes: number; apoyos: number })[]
  /** Short searches worth trying (sports, torneos, places). */
  recommended: string[]
  /** Posts with a photo for the explore grid, most popular first. */
  grid: SearchPost[]
}

/** What the search screen shows before typing. */
export async function getSearchExplore(): Promise<SearchExplore> {
  const [viewer, feed] = await Promise.all([getViewer(), getCompanerosFeed()])

  const suggested: SearchPerson[] = []
  const wantsAthletes = !viewer || viewer.role !== 'deportista'
  // Athletes see other athletes and the brands; brands and institutions see athletes first.
  for (const a of Object.values(athletes)) {
    const key = seedAthleteKey(a.id)
    if (key === viewer?.key) continue
    suggested.push({ key, name: a.name, role: 'deportista', subtitle: `${a.sport} · ${a.city}`, image: a.image, initials: a.name.slice(0, 2).toUpperCase(), openable: true })
  }
  if (!wantsAthletes) {
    for (const c of companies.slice(0, 3)) {
      suggested.push({ key: c.key, name: c.name, role: 'empresa', subtitle: c.industry, image: c.image, initials: c.initials, openable: false, about: c.about })
    }
  }
  // Athletes still looking for a sponsor go first for brands.
  const seeking = new Set(Object.values(athletes).filter((a) => a.seekingSponsor).map((a) => seedAthleteKey(a.id)))
  if (wantsAthletes) suggested.sort((a, b) => Number(seeking.has(b.key)) - Number(seeking.has(a.key)))

  const popular = [...feed]
    .sort((a, b) => b.likes + b.apoyos * 3 - (a.likes + a.apoyos * 3))
    .slice(0, 5)
    .map((p) => ({ id: p.id, ownerKey: p.author.key, author: p.author.name, text: p.body, image: p.image, label: 'Compañeros', likes: p.likes, apoyos: p.apoyos }))

  const sports = [...new Set(Object.values(athletes).map((a) => a.sport.split(' · ')[0]))]
  const torneos = events.filter((e) => e.kind === 'Torneo' || e.registrationOpen).map((e) => e.name)
  const recommended = [...new Set([...torneos.slice(0, 3), ...sports.slice(0, 5)])].slice(0, 8)

  const grid = [...feed]
    .filter((p) => p.image)
    .sort((a, b) => b.likes + b.apoyos * 3 - (a.likes + a.apoyos * 3))
    .slice(0, 30)
    .map((p) => ({ id: p.id, ownerKey: p.author.key, author: p.author.name, text: p.body, image: p.image, label: 'Compañeros' }))

  return { suggested: suggested.slice(0, 6), popular, recommended, grid }
}
