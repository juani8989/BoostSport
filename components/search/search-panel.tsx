'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, CalendarDays, ExternalLink, Loader2, MapPin, Newspaper, Search, Sparkles, TrendingUp, X } from 'lucide-react'
import { useNav } from '@/components/app/nav'
import { PartyAvatar } from '@/components/app/kit'
import { EventDetail } from '@/components/home/eventos-feed'
import { CompanyProfileSheet } from '@/components/home/empresas-feed'
import { RealOrgSheetByKey } from '@/components/home/real-org'
import { companyFromKey, events, type SportEvent } from '@/lib/catalog'
import type { SearchExplore, SearchPerson, SearchPost, SearchResults } from '@/app/actions/search'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'
import { thumbOf } from '@/lib/image-variants'

type Filter = 'todo' | 'people' | 'posts' | 'events' | 'references'

const filters: { id: Filter; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'people', label: 'Usuarios' },
  { id: 'posts', label: 'Contenido' },
  { id: 'events', label: 'Torneos' },
  { id: 'references', label: 'Referencias' },
]

const roleLabel: Record<SearchPerson['role'], string> = { deportista: 'Deportista', empresa: 'Sponsor', evento: 'Institución' }

const POST_ID = /^(seed:d\d+|post:\d+)$/

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/** Recent searches stay on this device only: words searched and people opened, newest first. */
const HISTORY_KEY = 'boostsport:search-history'
const HISTORY_MAX = 12

type Recent = { type: 'text'; q: string } | { type: 'person'; person: SearchPerson }
const recentId = (r: Recent) => (r.type === 'text' ? `q:${r.q.toLowerCase()}` : `p:${r.person.key}`)

function useSearchHistory() {
  const [items, setItems] = useState<Recent[]>([])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      if (!Array.isArray(saved)) return
      // Older versions saved only the words.
      const list = saved
        .map((x): Recent | null => (typeof x === 'string' ? { type: 'text', q: x } : x?.type === 'text' && typeof x.q === 'string' ? x : x?.type === 'person' && typeof x.person?.key === 'string' ? x : null))
        .filter((x): x is Recent => !!x)
      setItems(list.slice(0, HISTORY_MAX))
    } catch {}
  }, [])
  const write = (next: Recent[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {}
    return next
  }
  const push = useCallback((r: Recent) => setItems((prev) => write([r, ...prev.filter((x) => recentId(x) !== recentId(r))].slice(0, HISTORY_MAX))), [])
  const add = useCallback((q: string) => {
    const term = q.trim()
    if (term) push({ type: 'text', q: term })
  }, [push])
  const addPerson = useCallback((person: SearchPerson) => push({ type: 'person', person }), [push])
  return {
    items,
    add,
    addPerson,
    remove: (r: Recent) => setItems((prev) => write(prev.filter((x) => recentId(x) !== recentId(r)))),
    clear: () => setItems(write([])),
  }
}

export function SearchPanel() {
  const nav = useNav()
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<Filter>('todo')
  // Like Instagram: the explore grid until you tap the search box, then your recent searches.
  const [focused, setFocused] = useState(false)
  const [eventOpen, setEventOpen] = useState<SportEvent | null>(null)
  const [brandOpen, setBrandOpen] = useState<SearchPerson | null>(null)
  const [realOrgOpen, setRealOrgOpen] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const history = useSearchHistory()
  const query = useDebounced(text.trim(), 250)
  const { data, isLoading, error } = useSWR(query ? ['search', query] : null, () => load('searchEverything', query), { keepPreviousData: true })
  const { data: explore } = useSWR('search-explore', () => load('getSearchExplore'))

  const results: SearchResults | undefined = query ? data : undefined
  const total = results ? results.people.length + results.posts.length + results.events.length + results.references.length : 0
  const show = (f: Exclude<Filter, 'todo'>) => (filter === 'todo' || filter === f) && !!results?.[f].length

  // Opening something from the results keeps that search in the history.
  const remember = () => history.add(query)
  const searchFor = (q: string) => {
    setText(q)
    setFocused(true)
    history.add(q)
  }
  const leave = () => {
    setText('')
    setFocused(false)
    input.current?.blur()
  }
  function openPerson(p: SearchPerson) {
    history.addPerson(p)
    // Real sponsors and institutions have their own page; athletes open their profile.
    if (p.role !== 'deportista' && p.key.startsWith('user:')) setRealOrgOpen(p.key)
    else if (p.openable) nav.openProfile(p.key)
    else setBrandOpen(p)
  }
  const openPost = (p: SearchPost) => nav.openProfile(p.ownerKey, POST_ID.test(p.id) ? p.id : undefined)
  const searching = focused || !!text

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[975px] shrink-0 px-4 pb-3 pt-16 md:px-8 md:pt-8">
        <h1 className="sr-only">Buscar</h1>
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {searching ? (
            <button type="button" onClick={leave} aria-label="Volver a explorar" className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-secondary">
              <ArrowLeft className="size-5" />
            </button>
          ) : null}
          <form
            role="search"
            className="min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              history.add(text)
              input.current?.blur()
            }}
          >
            <label className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 focus-within:ring-2 focus-within:ring-olympic-blue">
              <Search aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <input
                ref={input}
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={(e) => e.key === 'Escape' && leave()}
                placeholder="Buscar personas, publicaciones, torneos…"
                aria-label="Buscar en BoostSport"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              />
              {isLoading ? <Loader2 aria-label="Buscando" className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
              {text ? (
                <button type="button" onClick={() => (setText(''), input.current?.focus())} aria-label="Borrar búsqueda" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20">
                  <X className="size-3.5" />
                </button>
              ) : null}
            </label>
          </form>
        </div>
        {query ? (
          <div role="tablist" aria-label="Qué buscar" className="mx-auto mt-3 flex max-w-2xl gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors', filter === f.id ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-28 md:pb-8">
        <div className={cn('mx-auto w-full px-4 md:px-8', query || searching ? 'max-w-2xl' : 'max-w-[975px]')}>
          {!query && !searching ? (
            <Explore explore={explore} onPerson={openPerson} onPost={openPost} />
          ) : !query ? (
            <div className="flex flex-col gap-7">
              <Section
                title="Recientes"
                action={
                  history.items.length ? (
                    <button type="button" onClick={history.clear} className="text-sm font-semibold text-olympic-blue hover:text-foreground">
                      Borrar todo
                    </button>
                  ) : null
                }
              >
                {history.items.length ? (
                  history.items.map((h) => (
                    <div key={recentId(h)} className="flex items-center gap-1 rounded-xl hover:bg-secondary">
                      {h.type === 'person' ? (
                        <button type="button" onClick={() => openPerson(h.person)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left">
                          <PartyAvatar party={h.person} className="size-11" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{h.person.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {roleLabel[h.person.role]}
                              {h.person.subtitle ? ` · ${h.person.subtitle}` : ''}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <button type="button" onClick={() => searchFor(h.q)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
                            <Search aria-hidden className="size-4 text-muted-foreground" />
                          </span>
                          <span className="truncate font-semibold">{h.q}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => history.remove(h)}
                        aria-label={`Quitar ${h.type === 'person' ? h.person.name : `“${h.q}”`} de recientes`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No hay búsquedas recientes.</p>
                )}
              </Section>

              <Section title="Te recomendamos buscar" icon={<TrendingUp className="size-3.5" />}>
                <div className="flex flex-wrap gap-2 px-2 pt-1">
                  {(explore?.recommended ?? []).map((r) => (
                    <button key={r} type="button" onClick={() => searchFor(r)} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
                      <Search aria-hidden className="size-3.5 text-muted-foreground" />
                      {r}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Torneos para explorar" icon={<CalendarDays className="size-3.5" />}>
                {events.map((e) => (
                  <Row key={e.id} onClick={() => setEventOpen(e)} image={e.image} title={e.name} subtitle={`${e.kind} · ${e.date}`} />
                ))}
              </Section>
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No pudimos buscar ahora. Probá de nuevo en un rato.</p>
          ) : results && total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No encontramos nada con “{query}”.</p>
          ) : results ? (
            <div className="flex flex-col gap-6" aria-live="polite">
              {show('people') ? (
                <Section title="Usuarios">
                  {results.people.map((p) => (
                    <PersonRow key={p.key} person={p} onClick={() => (remember(), openPerson(p))} />
                  ))}
                </Section>
              ) : null}

              {show('posts') ? (
                <Section title="Contenido">
                  {results.posts.map((p) => (
                    <PostRow key={p.id} post={p} onClick={() => (remember(), openPost(p))} />
                  ))}
                </Section>
              ) : null}

              {show('events') ? (
                <Section title="Torneos y eventos">
                  {results.events.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => (remember(), setEventOpen(events.find((x) => x.id === e.id) ?? null))}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbOf(e.image)} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.name}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <CalendarDays className="size-3 shrink-0" /> {e.date}
                        </span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" /> {e.place}
                        </span>
                      </span>
                    </button>
                  ))}
                </Section>
              ) : null}

              {show('references') ? (
                <Section title="Referencias">
                  {results.references.map((r) => (
                    <a key={`${r.athleteKey}-${r.url}`} href={r.url} target="_blank" rel="noopener noreferrer" onClick={remember} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <Newspaper className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-semibold leading-snug">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.source} · sobre {r.athleteName}
                        </span>
                      </span>
                      <ExternalLink aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </Section>
              ) : null}

              {filter !== 'todo' && !results[filter].length ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No hay {filters.find((f) => f.id === filter)?.label.toLowerCase()} con “{query}”.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {eventOpen ? <EventDetail event={eventOpen} onClose={() => setEventOpen(null)} /> : null}
      {realOrgOpen ? <RealOrgSheetByKey orgKey={realOrgOpen} onClose={() => setRealOrgOpen(null)} /> : null}
      {brandOpen && companyFromKey(brandOpen.key) ? <CompanyProfileSheet company={companyFromKey(brandOpen.key)!} onClose={() => setBrandOpen(null)} /> : null}
    </div>
  )
}

/** The explore page: people worth meeting in a row, then a grid of photos like Instagram's. */
function Explore({ explore, onPerson, onPost }: { explore?: SearchExplore; onPerson: (p: SearchPerson) => void; onPost: (p: SearchPost) => void }) {
  if (!explore) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 aria-label="Cargando" className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {explore.suggested.length ? (
        <section aria-label="Podría interesarte" className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5" /> Podría interesarte
          </h2>
          <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
            {explore.suggested.map((p) => (
              <li key={p.key} className="w-20 shrink-0">
                <button type="button" onClick={() => onPerson(p)} className="flex w-full flex-col items-center gap-1.5 text-center">
                  <PartyAvatar party={p} className="size-16 ring-[3px]" />
                  <span className="w-full truncate text-xs font-semibold">{p.name.split(' ')[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {explore.grid.length ? (
        <ul aria-label="Explorar publicaciones" className="grid grid-cols-3 gap-0.5 md:grid-cols-4 md:gap-1">
          {explore.grid.map((p) => (
            <li key={p.id} className="group relative aspect-[3/4] overflow-hidden bg-card">
              <button type="button" onClick={() => onPost(p)} aria-label={`${p.author}: ${p.text.slice(0, 60)}`} className="absolute inset-0 z-10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image ?? ''} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {p.author}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay publicaciones para explorar.</p>
      )}
    </div>
  )
}

function Section({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Row({ onClick, image, title, subtitle }: { onClick: () => void; image: string; title: string; subtitle: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  )
}

function PersonRow({ person, onClick }: { person: SearchPerson; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary">
      <PartyAvatar party={person} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{person.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {roleLabel[person.role]}
          {person.subtitle ? ` · ${person.subtitle}` : ''}
        </span>
      </span>
    </button>
  )
}

function PostRow({ post, onClick, rank, meta }: { post: SearchPost; onClick: () => void; rank?: number; meta?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary">
      {rank ? <span className="w-4 shrink-0 text-center font-display text-lg font-semibold text-muted-foreground">{rank}</span> : null}
      {post.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbOf(post.image)} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="size-14 shrink-0 rounded-lg bg-secondary" />
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-snug">{post.text}</span>
        {meta ?? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {post.author} · {post.label}
          </span>
        )}
      </span>
    </button>
  )
}
