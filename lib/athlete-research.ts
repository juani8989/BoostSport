import 'server-only'

import { generateText, Output } from 'ai'
import { z } from 'zod'
import { previewLink, searchMedia } from '@/lib/press'
import { WIKI_HEADERS } from '@/lib/wikipedia'
import type { PressLink, TimelineEntry } from '@/lib/profile-types'

/**
 * Looks an athlete up on the web while they sign up: Wikipedia (es and en), the news and
 * YouTube, all at once. Then an AI model turns what came back into a profile draft, keeping
 * where each fact came from. Without the AI it still returns the raw finds.
 */

export type ResearchSource = { title: string; url: string; source: string }

/** A profile on an official Olympic or federation database: the strongest sign of a high-performance athlete. */
export type OfficialSource = { source: string; url: string }

export type ResearchResult = {
  found: boolean
  name: string
  discipline: string
  country: string
  /** Public photos that may show the athlete; the best one first. Used to compare the selfie. */
  photos: string[]
  summary: string
  age: string
  club: string
  achievements: string[]
  timeline: TimelineEntry[]
  press: PressLink[]
  socials: { instagram: string; tiktok: string; x: string; youtube: string }
  wikiUrl?: string
  sources: ResearchSource[]
  /** Official profiles found for this athlete (Olympics.com, Olympedia, World Athletics…). */
  official: OfficialSource[]
  /** False when the AI couldn't be reached and only the raw finds came back. */
  usedAI: boolean
}

type WikiPage = { title: string; extract?: string; fullurl?: string; thumbnail?: { source: string }; pageprops?: { wikibase_item?: string } }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

async function searchWiki(lang: 'es' | 'en', query: string): Promise<(WikiPage & { lang: 'es' | 'en' })[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '6',
    prop: 'pageimages|extracts|info|pageprops',
    ppprop: 'wikibase_item',
    piprop: 'thumbnail',
    pithumbsize: '600',
    exintro: '1',
    explaintext: '1',
    exchars: '2500',
    exlimit: 'max',
    inprop: 'url',
    redirects: '1',
  })
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data = (await res.json()) as { query?: { pages?: WikiPage[] } }
    return (data.query?.pages ?? []).map((p) => ({ ...p, lang }))
  } catch {
    return []
  }
}

/** The Wikipedia page that is really about this person: full name in the title, and the sport mentioned. */
async function bestWikiPage(name: string, discipline: string) {
  const tokens = norm(name).split(/\s+/).filter((t) => t.length > 1)
  const surname = tokens[tokens.length - 1]
  const pages = (await Promise.all([searchWiki('es', `${name} ${discipline}`), searchWiki('en', `${name} ${discipline}`)])).flat()
  let best: { page: (typeof pages)[number]; score: number } | null = null
  for (const page of pages) {
    const title = norm(page.title)
    if (!surname || !title.includes(surname)) continue
    const matched = tokens.filter((t) => title.includes(t)).length / tokens.length
    if (matched < 0.75) continue
    let score = matched
    if (discipline && norm(page.extract ?? '').includes(norm(discipline).slice(0, 6))) score += 1
    if (page.thumbnail) score += 0.2
    if (!best || score > best.score) best = { page, score }
  }
  // Without the sport in the text it may be someone else with the same name.
  return best && best.score >= 1.5 ? best.page : null
}

/**
 * Official athlete databases linked from Wikidata: the IDs that the Olympic movement and the
 * federations give to their athletes. Works for any country.
 */
const OFFICIAL_IDS: Record<string, { source: string; url: (id: string) => string }> = {
  P5815: { source: 'Olympics.com', url: (id) => `https://www.olympics.com/en/athletes/${id}` },
  P8286: { source: 'Olympedia', url: (id) => `https://www.olympedia.org/athletes/${id}` },
  P1146: { source: 'World Athletics', url: (id) => `https://worldathletics.org/athletes/-/${id}` },
}

async function officialProfiles(wikidataId?: string): Promise<OfficialSource[]> {
  if (!wikidataId || !/^Q\d+$/.test(wikidataId)) return []
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data = (await res.json()) as { entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> }> }
    const claims = data.entities?.[wikidataId]?.claims ?? {}
    const found: OfficialSource[] = []
    for (const [prop, def] of Object.entries(OFFICIAL_IDS)) {
      const id = claims[prop]?.[0]?.mainsnak?.datavalue?.value
      if (typeof id === 'string' && /^[\w.-]+$/.test(id)) found.push({ source: def.source, url: def.url(id) })
    }
    return found
  } catch {
    return []
  }
}

const draftSchema = z.object({
  isAthlete: z.boolean().describe('Las fuentes hablan claramente de un deportista con ese nombre y ese deporte'),
  summary: z.string().describe('Dos oraciones en español sobre quién es, solo con lo que dicen las fuentes'),
  age: z.string().describe('Edad en años si las fuentes la dicen o se deduce de la fecha de nacimiento; si no, vacío'),
  club: z.string().describe('Club, equipo o academia actual si aparece; si no, vacío'),
  achievements: z.array(z.string()).describe('Logros concretos (medallas, títulos, clasificaciones), máximo 8'),
  timeline: z.array(z.object({ year: z.string(), text: z.string() })).describe('Hitos con año, en orden cronológico, máximo 10'),
  instagram: z.string().describe('Usuario de Instagram si aparece textual en las fuentes (con @); si no, vacío'),
})

async function draftWithAI(input: { name: string; discipline: string; country: string; wiki?: string; press: PressLink[] }) {
  const evidence = [
    input.wiki ? `WIKIPEDIA:\n${input.wiki}` : '',
    input.press.length ? `PRENSA Y VIDEOS:\n${input.press.map((p, i) => `${i + 1}. ${p.title} (${p.source}${p.date ? `, ${p.date.slice(0, 10)}` : ''})`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  if (!evidence) return null
  const { output } = await generateText({
    model: 'anthropic/claude-sonnet-5.5',
    output: Output.object({ schema: draftSchema }),
    prompt: `Armá el borrador del perfil deportivo de ${input.name} (${input.discipline}, ${input.country}) para una app que conecta deportistas con sponsors. Usá SOLO la información de las fuentes de abajo; no inventes nada. Si las fuentes hablan de otra persona con el mismo nombre, isAthlete es false.\n\n${evidence}`,
    abortSignal: AbortSignal.timeout(25_000),
  })
  return output
}

export async function researchAthlete(input: { name: string; discipline: string; country: string }): Promise<ResearchResult> {
  const { name, discipline, country } = input
  const [wiki, press] = await Promise.all([
    bestWikiPage(name, discipline),
    searchMedia({ name, nicknames: [], handles: [], discipline, club: '', country, famous: false }).catch(() => [] as PressLink[]),
  ])

  // Photos to compare the selfie with: the Wikipedia portrait and the images of the top news articles.
  const articles = press.filter((p) => !/youtube\.com|youtu\.be/.test(p.url)).slice(0, 4)
  const previews = await Promise.all(articles.map((a) => previewLink(a.url).catch(() => null)))
  const photos = [wiki?.thumbnail?.source, ...previews.map((p) => p?.image)].filter((x): x is string => !!x)

  const official = await officialProfiles(wiki?.pageprops?.wikibase_item)

  const sources: ResearchSource[] = [
    ...(wiki?.fullurl ? [{ title: wiki.title, url: wiki.fullurl, source: `Wikipedia (${wiki.lang})` }] : []),
    ...press.slice(0, 12).map((p) => ({ title: p.title, url: p.url, source: p.source })),
  ]

  let draft: Awaited<ReturnType<typeof draftWithAI>> = null
  try {
    draft = await draftWithAI({ name, discipline, country, wiki: wiki?.extract, press: press.slice(0, 15) })
  } catch (error) {
    console.error('[athlete-research] AI draft failed', error)
  }

  const found = draft ? draft.isAthlete : !!wiki || press.length >= 2
  return {
    found,
    name,
    discipline,
    country,
    photos: [...new Set(photos)].slice(0, 4),
    summary: draft?.summary || wiki?.extract?.split('. ').slice(0, 2).join('. ') || '',
    age: draft?.age ?? '',
    club: draft?.club ?? '',
    achievements: draft?.achievements ?? [],
    timeline: draft?.timeline ?? [],
    press: press.slice(0, 12),
    socials: { instagram: draft?.instagram ?? '', tiktok: '', x: '', youtube: '' },
    wikiUrl: wiki?.fullurl,
    sources,
    official,
    usedAI: !!draft,
  }
}
