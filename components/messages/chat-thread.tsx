'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { ArrowLeft, Check, FileSignature, Handshake, Loader2, Send, X } from 'lucide-react'
import { getThread, respondOffer, sendMessage, sendOffer, type OfferMeta, type OfferType, type ThreadMessage } from '@/app/actions/match'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, Sheet, isComposing } from '@/components/app/kit'
import { needOptions } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

export function ChatThread({ matchId, onBack }: { matchId: number; onBack: () => void }) {
  const nav = useNav()
  const { data, mutate, isLoading } = useSWR(['thread', matchId], () => load('getThread', matchId), { refreshInterval: 5000 })
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [offering, setOffering] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [data?.messages.length])

  async function send() {
    const body = text.trim()
    if (!body || pending) return
    setPending(true)
    setText('')
    await sendMessage(matchId, body)
    setPending(false)
    mutate()
    globalMutate('matches')
  }

  async function respond(id: number, accept: boolean) {
    await respondOffer(id, accept)
    mutate()
    globalMutate('matches')
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-5">
        <button type="button" onClick={onBack} aria-label="Volver" className="flex size-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="size-4" />
        </button>
        {data ? (
          <button
            type="button"
            disabled={data.other.role !== 'deportista'}
            onClick={() => nav.openProfile(data.other.key)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <PartyAvatar party={data.other} className="size-9" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-semibold">{data.other.name}</span>
              <span className="truncate text-xs text-muted-foreground">{data.other.subtitle}</span>
            </span>
          </button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {isLoading ? <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-label="Cargando conversación" /> : null}
        {data === null ? <p className="text-center text-sm text-muted-foreground">No encontramos esta conversación.</p> : null}
        {data?.messages.map((m) => <Bubble key={m.id} message={m} onRespond={respond} />)}
        <div ref={endRef} />
      </div>

      {data ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-center gap-2 border-t border-border px-3 py-3"
        >
          <button type="button" onClick={() => setOffering(true)} aria-label="Enviar propuesta" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-olympic-yellow text-olympic-black">
            <FileSignature className="size-5" />
          </button>
          <label htmlFor="chat-input" className="sr-only">
            Escribí un mensaje
          </label>
          <input
            id="chat-input"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposing(e)) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Escribí un mensaje…"
            className="min-w-0 flex-1 rounded-full border border-input bg-card px-4 py-3 text-sm"
          />
          <button type="submit" disabled={!text.trim() || pending} aria-label="Enviar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-olympic-blue text-olympic-white disabled:opacity-50">
            <Send className="size-4" />
          </button>
        </form>
      ) : null}

      {offering ? (
        <OfferComposer
          isAthlete={nav.role === 'deportista'}
          onClose={() => setOffering(false)}
          onSend={async (offer) => {
            const res = await sendOffer(matchId, offer)
            if (res.ok) {
              setOffering(false)
              mutate()
              globalMutate('matches')
            }
            return res.ok ? null : res.error
          }}
        />
      ) : null}
    </div>
  )
}

const statusLabel: Record<OfferMeta['status'], { text: string; className: string }> = {
  pendiente: { text: 'Pendiente', className: 'bg-olympic-yellow text-olympic-black' },
  aceptada: { text: 'Aceptada', className: 'bg-olympic-green text-olympic-white' },
  rechazada: { text: 'Rechazada', className: 'bg-olympic-red text-olympic-white' },
}

function Bubble({ message, onRespond }: { message: ThreadMessage; onRespond: (id: number, accept: boolean) => void }) {
  if (message.kind === 'system') {
    return <p className="self-center rounded-full bg-secondary px-3 py-1 text-center text-xs text-muted-foreground">{message.body}</p>
  }

  if (message.kind === 'offer' && message.meta) {
    const meta = message.meta
    return (
      <div className={cn('flex w-[85%] flex-col gap-3 rounded-2xl border-2 p-4', message.mine ? 'self-end border-olympic-blue' : 'self-start border-olympic-yellow')}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <Handshake className="size-5 text-olympic-yellow" />
            {meta.type}
          </span>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', statusLabel[meta.status].className)}>{statusLabel[meta.status].text}</span>
        </div>
        <span className="text-xs text-muted-foreground">{message.body}</span>
        {meta.counterpart?.length ? <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">La marca aporta</span> : null}
        <ul className="flex flex-wrap gap-1.5">
          {meta.items.map((i) => (
            <li key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
              {i}
            </li>
          ))}
        </ul>
        {meta.counterpart?.length ? (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">El evento da a cambio</span>
            <ul className="flex flex-wrap gap-1.5">
              {meta.counterpart.map((i) => (
                <li key={i} className="rounded-full bg-olympic-green/20 px-2.5 py-1 text-xs font-semibold">
                  {i}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {meta.rationale ? <p className="text-xs leading-relaxed text-muted-foreground">{meta.rationale}</p> : null}
        <dl className="grid grid-cols-2 gap-2 text-xs">
          {meta.amount ? (
            <div>
              <dt className="text-muted-foreground">Monto</dt>
              <dd className="font-semibold">{meta.amount}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Duración</dt>
            <dd className="font-semibold">{meta.duration}</dd>
          </div>
        </dl>
        {!message.mine && meta.status === 'pendiente' ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => onRespond(message.id, true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-olympic-green py-2 text-sm font-bold text-olympic-white">
              <Check className="size-4" />
              Aceptar
            </button>
            <button type="button" onClick={() => onRespond(message.id, false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary py-2 text-sm font-bold">
              <X className="size-4" />
              Rechazar
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <p
      className={cn(
        'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        message.mine ? 'self-end rounded-br-sm bg-olympic-blue text-olympic-white' : 'self-start rounded-bl-sm bg-card',
      )}
    >
      {message.body}
    </p>
  )
}

const offerTypes: OfferType[] = ['Producto', 'Dinero', 'Embajador']

function OfferComposer({
  isAthlete,
  onClose,
  onSend,
}: {
  isAthlete: boolean
  onClose: () => void
  onSend: (offer: { type: OfferType; items: string[]; amount: string; duration: string }) => Promise<string | null>
}) {
  const [type, setType] = useState<OfferType>('Producto')
  const [items, setItems] = useState<string[]>([])
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('6 meses')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (i: string) => setItems((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!items.length) return setError('Elegí al menos un beneficio.')
    setPending(true)
    const err = await onSend({ type, items, amount, duration })
    setPending(false)
    setError(err)
  }

  return (
    <Sheet title={isAthlete ? 'Contrapropuesta' : 'Nueva propuesta'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Tipo de acuerdo</legend>
          <div className="flex gap-2">
            {offerTypes.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn('flex-1 rounded-full py-2 text-sm font-bold', type === t ? 'bg-olympic-yellow text-olympic-black' : 'bg-secondary text-muted-foreground')}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{isAthlete ? 'Qué necesitás' : 'Qué ofrecés'}</legend>
          <div className="flex flex-wrap gap-2">
            {needOptions.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={items.includes(n)}
                onClick={() => toggle(n)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', items.includes(n) ? 'bg-olympic-blue text-olympic-white' : 'bg-secondary text-muted-foreground')}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Monto (opcional)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} maxLength={40} placeholder="USD 300 / mes" className="rounded-xl border border-input bg-background px-3 py-2.5 font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Duración
            <input value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={40} className="rounded-xl border border-input bg-background px-3 py-2.5 font-normal" />
          </label>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-full bg-olympic-yellow px-5 py-3 font-bold text-olympic-black disabled:opacity-60">
          {pending ? 'Enviando…' : 'Enviar propuesta'}
        </button>
      </form>
    </Sheet>
  )
}
