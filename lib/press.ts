import 'server-only'

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { PressKind, PressLink } from '@/lib/profile-types'

const UA = 'Mozilla/5.0 (compatible; BoostSportBot/1.0; +https://marketplace-de-deportistas.vercel.app)'

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

/** Guesses whether a link is an interview, a video, a podcast or a plain article. */
export function classifyPress(url: string, title: string): PressKind {
  const t = title.toLowerCase()
  const host = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return ''
    }
  })()
  if (/spotify|podcasts?\.apple|ivoox|anchor\.fm/.test(host) || /podcast/.test(t)) return 'podcast'
  if (/entrevista|mano a mano|charla con|habló|hablo con|en primera persona|"[^"]{20,}"/.test(t)) return 'entrevista'
  if (/youtube\.com|youtu\.be|vimeo|tiktok|twitch/.test(host) || /\bvideo\b/.test(t)) return 'video'
  if (/instagram|twitter|x\.com|facebook|linkedin|wikipedia/.test(host)) return 'link'
  return 'noticia'
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) return ip === '::1' || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || ip.startsWith('::ffff:') && isPrivateIp(ip.slice(7))
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

/** Only public https pages: blocks localhost and private networks so users can't make the server fetch internal addresses. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('El link no es válido.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('El link tiene que empezar con https://')
  if (url.username || url.password) throw new Error('El link no es válido.')
  const host = url.hostname
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Ese link no es público.')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (!addresses.length) throw new Error('No encontramos ese sitio.')
  if (addresses.some((a) => isPrivateIp(a.address))) throw new Error('Ese link no es público.')
  return url
}

const meta = (html: string, ...names: string[]) => {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i')
    const tag = html.match(re)?.[0]
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1]
    if (content) return decode(content)
  }
  return ''
}

/** Reads title, site, date and image from a page's Open Graph tags. */
export async function previewLink(raw: string): Promise<PressLink> {
  let url = await assertPublicUrl(raw)
  let res: Response | null = null
  // Follow redirects by hand so every hop is checked before we connect to it.
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'manual', signal: AbortSignal.timeout(6000) })
    const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!next) break
    url = await assertPublicUrl(new URL(next, url).toString())
  }
  if (!res) throw new Error('No pudimos abrir el link.')
  const html = res.ok && (res.headers.get('content-type') ?? '').includes('html') ? (await res.text()).slice(0, 400_000) : ''

  const title = meta(html, 'og:title', 'twitter:title') || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') || url.hostname
  const source = meta(html, 'og:site_name', 'application-name') || url.hostname.replace(/^www\./, '')
  const rawDate = meta(html, 'article:published_time', 'og:published_time', 'date', 'pubdate', 'publish-date', 'datePublished')
  const date = rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : undefined
  const imageRaw = meta(html, 'og:image', 'og:image:url', 'twitter:image')
  let image: string | undefined
  try {
    image = imageRaw ? new URL(imageRaw, url).toString() : undefined
    if (image && !image.startsWith('https://')) image = undefined
  } catch {
    image = undefined
  }
  const finalUrl = url.toString()
  return { url: finalUrl, title: title.slice(0, 200), source: source.slice(0, 80), kind: classifyPress(finalUrl, title), date, image }
}

/** What we know about an athlete to find them in the media. */
export type Identity = {
  name: string
  nicknames: string[]
  handles: string[]
  discipline: string
  club: string
  country: string
  /** Well-known athletes are found by name alone. */
  famous: boolean
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const quote = (s: string) => `"${s.replace(/"/g, '')}"`

/** Search phrases: the full name, each nickname and handle, with context words for the ambiguous ones. */
function queriesFor(id: Identity) {
  const context = [id.discipline, id.club].filter(Boolean).join(' ')
  const queries = [`${quote(id.name)}${id.famous ? '' : ` ${id.discipline}`}`.trim()]
  for (const nick of id.nicknames) queries.push(`${quote(nick)} ${context || id.name.split(' ').pop()}`.trim())
  for (const handle of id.handles) queries.push(quote(handle))
  return [...new Set(queries)].slice(0, 6)
}

/**
 * How sure we are a result is about this athlete: the full name, a nickname or a handle
 * must appear; discipline, club and country add confidence.
 */
export function relevance(id: Identity, text: string) {
  const t = norm(text)
  const has = (s: string) => s.length >= 3 && t.includes(norm(s))
  const lastName = id.name.trim().split(/\s+/).pop() ?? ''
  let score = 0
  if (has(id.name)) score += 4
  if (id.nicknames.some(has)) score += 3
  if (id.handles.some((h) => has(h) || has(h.replace(/^@/, '')))) score += 3
  if (!score) return 0
  if (lastName && has(lastName)) score += 1
  if (has(id.discipline)) score += 2
  if (id.club && has(id.club)) score += 2
  if (id.country && has(id.country)) score += 1
  // A nickname alone is too ambiguous without some context.
  if (score === 3 && !has(id.name)) return 0
  return score
}

async function googleNews(q: string): Promise<(PressLink & { text: string })[]> {
  const params = new URLSearchParams({ q, hl: 'es-419', gl: 'AR', ceid: 'AR:es-419' })
  try {
    const res = await fetch(`https://news.google.com/rss/search?${params}`, { headers: { 'User-Agent': UA }, next: { revalidate: 60 * 60 * 6 }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const xml = await res.text()
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20).flatMap(([, item]) => {
      const pick = (tag: string) => decode(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '')
      const source = pick('source')
      // Google appends " - Medio" to the title.
      const title = pick('title').replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
      const url = pick('link')
      const pub = pick('pubDate')
      if (!url || !title) return []
      return [{ url, title, source: source || 'Google Noticias', kind: classifyPress(url, title), date: pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : undefined, text: `${title} ${pick('description')}` }]
    })
  } catch {
    return []
  }
}

const AGO: Record<string, number> = { segundo: 1, minuto: 60, hora: 3600, dia: 86400, semana: 604800, mes: 2592000, ano: 31536000, second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000, year: 31536000 }

/** "hace 3 meses" / "3 months ago" → an approximate date. */
function fromRelative(text: string) {
  const m = norm(text).match(/(\d+)\s+(segundo|minuto|hora|dia|semana|mes|ano|second|minute|hour|day|week|month|year)/)
  return m ? new Date(Date.now() - Number(m[1]) * AGO[m[2]] * 1000).toISOString() : undefined
}

type YtNode = Record<string, unknown>
const runs = (v: unknown) => ((v as { runs?: { text: string }[]; simpleText?: string } | undefined)?.runs?.map((r) => r.text).join('') ?? (v as { simpleText?: string } | undefined)?.simpleText ?? '')

/** Videos from YouTube's search page (no API key needed). Best effort: if the page changes, it returns nothing. */
async function youtube(q: string): Promise<(PressLink & { text: string })[]> {
  try {
    const res = await fetch(`https://www.youtube.com/results?${new URLSearchParams({ search_query: q, hl: 'es-419', gl: 'AR' })}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36', 'Accept-Language': 'es-AR,es;q=0.9' },
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const html = await res.text()
    const start = html.indexOf('var ytInitialData = ')
    if (start < 0) return []
    const end = html.indexOf(';</script>', start)
    const data = JSON.parse(html.slice(start + 'var ytInitialData = '.length, end)) as YtNode
    const found: YtNode[] = []
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object' || found.length >= 15) return
      if ('videoRenderer' in (node as YtNode)) found.push((node as YtNode).videoRenderer as YtNode)
      for (const v of Object.values(node as YtNode)) walk(v)
    }
    walk(data)
    return found.flatMap((v) => {
      const id = v.videoId as string | undefined
      const title = runs(v.title)
      if (!id || !title) return []
      const thumbs = (v.thumbnail as { thumbnails?: { url: string }[] } | undefined)?.thumbnails ?? []
      const channel = runs(v.ownerText) || 'YouTube'
      return [{
        url: `https://www.youtube.com/watch?v=${id}`,
        title,
        source: `YouTube · ${channel}`,
        kind: classifyPress('https://youtube.com', title) === 'entrevista' ? 'entrevista' : 'video',
        date: fromRelative(runs(v.publishedTimeText)),
        image: thumbs.at(-1)?.url?.split('?')[0],
        text: `${title} ${channel} ${(v.detailedMetadataSnippets as { snippetText?: unknown }[] | undefined)?.map((d) => runs(d.snippetText)).join(' ') ?? runs(v.descriptionSnippet)}`,
      } satisfies PressLink & { text: string }]
    })
  } catch {
    return []
  }
}

/**
 * News and videos about an athlete, searched by their name, nicknames and handles, kept
 * only when the result really points to them. Cached for six hours per search.
 */
export async function searchMedia(id: Identity): Promise<PressLink[]> {
  const queries = queriesFor(id)
  const results = (await Promise.all(queries.flatMap((q) => [googleNews(q), youtube(q)]))).flat()
  const best = new Map<string, PressLink & { score: number }>()
  for (const { text, ...item } of results) {
    const score = relevance(id, text)
    if (!score) continue
    const prev = best.get(item.url)
    if (!prev || prev.score < score) best.set(item.url, { ...item, score })
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score || (b.date ?? '').localeCompare(a.date ?? ''))
  // YouTube returns many more hits than the news; alternate them so both show up.
  const videos = ranked.filter((r) => r.url.includes('youtube.com/'))
  const rest = ranked.filter((r) => !r.url.includes('youtube.com/'))
  const mixed: typeof ranked = []
  while (mixed.length < 20 && (videos.length || rest.length)) {
    if (rest.length) mixed.push(rest.shift()!)
    if (videos.length && mixed.length < 20) mixed.push(videos.shift()!)
  }
  return mixed.map(({ score: _score, ...item }) => item)
}
