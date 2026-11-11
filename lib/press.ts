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

/** Recent news that mention the name, from Google News. Cached for six hours. */
export async function searchNews(name: string, context: string): Promise<PressLink[]> {
  const q = `"${name}"${context ? ` ${context}` : ''}`
  const params = new URLSearchParams({ q, hl: 'es-419', gl: 'AR', ceid: 'AR:es-419' })
  try {
    const res = await fetch(`https://news.google.com/rss/search?${params}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15)
    const needle = name.toLowerCase()
    return items.flatMap(([, item]) => {
      const pick = (tag: string) => decode(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '')
      const source = pick('source')
      // Google appends " - Medio" to the title.
      const title = pick('title').replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
      const url = pick('link')
      const pub = pick('pubDate')
      const lastName = needle.split(' ').pop() ?? needle
      const haystack = `${title} ${pick('description')}`.toLowerCase()
      if (!url || !title || !(haystack.includes(needle) || haystack.includes(lastName))) return []
      return [{ url, title, source: source || 'Google Noticias', kind: classifyPress(url, title), date: pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : undefined }]
    })
  } catch {
    return []
  }
}
