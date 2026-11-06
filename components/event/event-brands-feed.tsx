'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Handshake, Info } from 'lucide-react'
import { listBrands, type BrandCard } from '@/app/actions/org'
import { InviteButton } from '@/components/org/invite-button'
import { Sheet } from '@/components/app/kit'
import { SearchBox } from '@/components/event/event-athletes-feed'
import { ContractSheet } from '@/components/event/contract-sheet'
import { load } from '@/lib/load'

export function EventBrandsFeed() {
  const [query, setQuery] = useState('')
  const { data, isLoading, mutate } = useSWR(['event-brands', query], ([, q]) => load('listBrands', q))
  const [detail, setDetail] = useState<BrandCard | null>(null)
  const [contract, setContract] = useState<BrandCard | null>(null)

  return (
    <section aria-label="Marcas para invitar" className="flex flex-col gap-4">
      <SearchBox value={query} onChange={setQuery} label="Buscar marcas por rubro o nombre" />
      {isLoading && !data ? <p className="text-sm text-muted-foreground">Cargando marcas…</p> : null}
      {data && !data.length ? <p className="text-sm text-muted-foreground">No encontramos marcas con esa búsqueda.</p> : null}
      <ul className="flex flex-col gap-4">
        {data?.map((b) => (
          <li key={b.party.key}>
            <article className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
              {b.party.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={b.party.image} alt="" className="h-32 w-full object-cover" />
              ) : null}
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <h3 className="font-display text-xl font-semibold leading-tight">{b.party.name}</h3>
                  <p className="text-xs text-muted-foreground">{b.party.subtitle}</p>
                </div>
                {b.about ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{b.about}</p> : null}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDetail(b)}
                    className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
                  >
                    <Info className="size-3.5" />
                    Conocer
                  </button>
                  <InviteButton candidate={b} onInvited={() => mutate()} />
                  <button
                    type="button"
                    onClick={() => setContract(b)}
                    className="flex items-center gap-1.5 rounded-full bg-olympic-yellow px-3 py-2 text-xs font-bold text-olympic-black"
                  >
                    <Handshake className="size-3.5" />
                    Proponer contrato
                  </button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {detail ? <BrandDetail brand={detail} onClose={() => setDetail(null)} onPropose={() => { setContract(detail); setDetail(null) }} /> : null}
      {contract ? <ContractSheet brand={contract} onClose={() => setContract(null)} onSent={() => mutate()} /> : null}
    </section>
  )
}

function BrandDetail({ brand, onClose, onPropose }: { brand: BrandCard; onClose: () => void; onPropose: () => void }) {
  return (
    <Sheet title={brand.party.name} onClose={onClose} tall>
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">{brand.party.subtitle}</p>
        {brand.about ? <p className="text-sm leading-relaxed">{brand.about}</p> : null}
        <DetailList title="Qué busca" items={brand.lookingFor} />
        <DetailList title="Qué puede aportar" items={brand.offers} />
        {brand.merch.length ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Productos</h3>
            <ul className="grid grid-cols-3 gap-2">
              {brand.merch.map((m) => (
                <li key={m.name} className="flex flex-col gap-1">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={m.image} alt={m.name} className="aspect-square w-full rounded-xl bg-secondary object-cover" />
                  ) : null}
                  <span className="text-xs font-semibold leading-tight">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.price}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {brand.website ? <p className="text-xs text-muted-foreground">{brand.website}</p> : null}
        <button type="button" onClick={onPropose} className="flex items-center justify-center gap-2 rounded-full bg-olympic-yellow py-3 font-bold text-olympic-black">
          <Handshake className="size-4" />
          Proponer contrato
        </button>
      </div>
    </Sheet>
  )
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}
