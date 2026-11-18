'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { CalendarDays, Clock, ExternalLink, Flame, Heart, HandHeart, Loader2, MapPin, Newspaper, Search, Sparkles, TrendingUp, X } from 'lucide-react'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, compactNumber } from '@/components/app/kit'
import { EventDetail } from '@/components/home/eventos-feed'
import { CompanyProfileSheet } from '@/components/home/empresas-feed'
import { RealOrgSheetByKey } from '@/components/home/real-org'
import { companyFromKey, events, type SportEvent } from '@/lib/catalog'
import type { SearchExplore, SearchPerson, SearchPost, SearchResults } from '@/app/actions/search'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

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

/** Recent searches stay on this device only. */
const HISTORY_KEY = 'boostsport:search-history'
const HISTORY_MAX = 8

function useSearchHistory() {
  const [items, setItems] = useState<string[]>([])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      if (Array.isArray(saved)) setItems(saved.filter((x): x is string => typeof x === 'string').slice(0, HISTORY_MAX))
    } catch {}
  }, [])
  const save = (next: string[]) => {
    setItems(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {}
  }
  const add = useCallback((q: string) => {
    const term = q.trim()
    if (!term) return
    setItems((prev) => {
      const next = [term, ...prev.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, HISTORY_MAX)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])
  return { items, add, remove: (q: string) => save(items.filter((x) => x !== q)), clear: () => save([]) }
}

export function SearchPanel() {
  const nav = useNav()
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<Filter>('todo')
  const [eventOpen, setEventOpen] = useState<SportEvent | null>(null)
  const [brandOpen, setBrandOpen] = useState<SearchPerson | null>(null)
  const [realOrgOpen, setRealOrgOpen] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const history = useSearchHistory()
  const query = useDebounced(text.trim(), 250)
  const { data, isLoading, error } = useSWR(query ? ['search', query] : null, () => load('searchEverything', query), { keepPreviousData: true })
  const { data: explore } = useSWR('search-explore', () => load('getSearchExplore'))

  useEffect(() => {
    // Phones don't open the keyboard on their own; on computers the cursor is ready to type.
    if (window.matchMedia('(min-width: 768px)').matches) input.current?.focus()
  }, [])

  const results: SearchResults | undefined = query ? data : undefined
  const total = results ? results.people.length + results.posts.length + results.events.length + results.references.length : 0
  const show = (f: Exclude<Filter, 'todo'>) => (filter === 'todo' || filter === f) && !!results?.[f].length

  // Opening something from the results keeps that search in the history.
  const remember = () => history.add(query)
  const searchFor = (q: string) => {
    setText(q)
    history.add(q)
  }
  function openPerson(p: SearchPerson) {
    // Real sponsors and institutions have their own page; athletes open their profile.
    if (p.role !== 'deportista' && p.key.startsWith('user:')) setRealOrgOpen(p.key)
    else if (p.openable) nav.openProfile(p.key)
    else setBrandOpen(p)
  }
  const openPost = (p: SearchPost) => nav.openProfile(p.ownerKey, POST_ID.test(p.id) ? p.id : undefined)

  return (
    <div className="flex h-full justify-center gap-8 md:px-8">
      <div className="flex h-full w-full min-w-0 flex-col md:max-w-[640px]">
        <div className="shrink-0 px-4 pb-3 pt-16 md:pt-8">
          <h1 className="sr-only">Buscar</h1>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              history.add(text)
              input.current?.blur()
            }}
          >
            <label className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 focus-within:ring-2 focus-within:ring-olympic-blue">
              <Search aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <input
                ref={input}
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Buscá personas, publicaciones, torneos…"
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
          {query ? (
            <div role="tablist" aria-label="Qué buscar" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 md:pb-8">
          {!query ? (
            <div className="flex flex-col gap-7">
              {history.items.length ? (
                <Section
                  title="Historial de búsqueda"
                  icon={<Clock className="size-3.5" />}
                  action={
                    <button type="button" onClick={history.clear} className="text-xs font-semibold text-olympic-blue">
                      Borrar todo
                    </button>
                  }
                >
                  {history.items.map((h) => (
                    <div key={h} className="flex items-center gap-1 rounded-xl hover:bg-secondary">
                      <button type="button" onClick={() => searchFor(h)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left">
                        <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{h}</span>
                      </button>
                      <button type="button" onClick={() => history.remove(h)} aria-label={`Quitar “${h}” del historial`} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </Section>
              ) : null}

              <Section title="Te recomendamos buscar" icon={<TrendingUp className="size-3.5" />}>
                <div className="flex flex-wrap gap-2 px-2 pt-1">
                  {(explore?.recommended ?? []).map((r) => (
                    <button key={r} type="button" onClick={() => searchFor(r)} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
                      <Search aria-hidden className="size-3.5 text-muted-foreground" />
                      {r}
                    </button>
                  ))}
                  {!explore ? <Loader2 aria-label="Cargando" className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>
              </Section>

              {/* On computers these live in the side column instead. */}
              <div className="flex flex-col gap-7 lg:hidden">
                <Discover explore={explore} onPerson={openPerson} onPost={openPost} />
              </div>

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
                      <img src={e.image} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
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

      {/* Side column on wide screens: always there, also while searching. */}
      <aside aria-label="Descubrí" className="hidden h-full w-80 shrink-0 flex-col gap-7 overflow-y-auto pb-8 pt-8 [scrollbar-width:thin] lg:flex">
        <Discover explore={explore} onPerson={openPerson} onPost={openPost} />
      </aside>

      {eventOpen ? <EventDetail event={eventOpen} onClose={() => setEventOpen(null)} /> : null}
      {realOrgOpen ? <RealOrgSheetByKey orgKey={realOrgOpen} onClose={() => setRealOrgOpen(null)} /> : null}
      {brandOpen && companyFromKey(brandOpen.key) ? <CompanyProfileSheet company={companyFromKey(brandOpen.key)!} onClose={() => setBrandOpen(null)} /> : null}
    </div>
  )
}

/** "Podría interesarte" and the most popular posts. */
function Discover({ explore, onPerson, onPost }: { explore?: SearchExplore; onPerson: (p: SearchPerson) => void; onPost: (p: SearchPost) => void }) {
  if (!explore) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 aria-label="Cargando sugerencias" className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  return (
    <>
      {explore.suggested.length ? (
        <Section title="Podría interesarte" icon={<Sparkles className="size-3.5" />}>
          {explore.suggested.map((p) => (
            <PersonRow key={p.key} person={p} onClick={() => onPerson(p)} />
          ))}
        </Section>
      ) : null}
      {explore.popular.length ? (
        <Section title="Publicaciones más populares" icon={<Flame className="size-3.5" />}>
          {explore.popular.map((p, i) => (
            <PostRow
              key={p.id}
              post={p}
              rank={i + 1}
              onClick={() => onPost(p)}
              meta={
                <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span className="truncate">{p.author}</span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    <Heart aria-hidden className="size-3" /> {compactNumber(p.likes)}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    <HandHeart aria-hidden className="size-3" /> {compactNumber(p.apoyos)}
                  </span>
                </span>
              }
            />
          ))}
        </Section>
      ) : null}
    </>
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
        <img src={post.image} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
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
