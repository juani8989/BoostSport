'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, Copy, HandHeart, Link2, Loader2, Mail, MessageCircle, Search, Send, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { sendMessage } from '@/app/actions/match'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { useNav } from '@/components/app/nav'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

export type ShareItem = {
  /** Short line that goes with the link ("Valentina en BoostSport: …"). */
  text: string
  url: string
  title: string
  subtitle?: string
  image?: string | null
  /** Set for posts: lets the person repost inside BoostSport. */
  repost?: { active: boolean; onToggle: () => void }
}

// Brand logos aren't in the icon set, so X, Facebook and LinkedIn use their letter on their color.
const nets: { label: string; icon: LucideIcon | string; className: string; href: (text: string, url: string) => string }[] = [
  { label: 'WhatsApp', icon: MessageCircle, className: 'bg-[#25d366] text-white', href: (t, u) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { label: 'Telegram', icon: Send, className: 'bg-[#229ed9] text-white', href: (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { label: 'X', icon: '𝕏', className: 'bg-foreground text-background', href: (t, u) => `https://x.com/intent/post?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { label: 'Facebook', icon: 'f', className: 'bg-[#1877f2] text-white', href: (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { label: 'LinkedIn', icon: 'in', className: 'bg-[#0a66c2] text-white', href: (_t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { label: 'Mail', icon: Mail, className: 'bg-secondary text-foreground', href: (t, u) => `mailto:?subject=${encodeURIComponent('Mirá esto en BoostSport')}&body=${encodeURIComponent(`${t}\n\n${u}`)}` },
]

/** Everything you can do to share a post or a profile, inside and outside BoostSport. */
export function ShareSheet({ item, onClose }: { item: ShareItem; onClose: () => void }) {
  const nav = useNav()
  const signedIn = nav.role !== 'invitado'
  const { data: chats, isLoading } = useSWR(signedIn ? 'matches' : null, () => load('getMatches'))
  const [query, setQuery] = useState('')
  const [sent, setSent] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const visibleChats = (chats ?? []).filter((c) => c.other.name.toLowerCase().includes(query.toLowerCase()))

  async function send(matchId: number) {
    setSending(matchId)
    setError(null)
    const res = await sendMessage(matchId, `${item.text}\n${item.url}`)
    setSending(null)
    if (!res.ok) return setError(res.error)
    setSent((prev) => new Set(prev).add(matchId))
  }

  async function copy() {
    await navigator.clipboard?.writeText(item.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet title="Compartir" onClose={onClose}>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-secondary p-3">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-background">
            <Share2 className="size-6 text-muted-foreground" />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{item.title}</span>
          {item.subtitle ? <span className="line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</span> : null}
        </span>
      </div>

      {item.repost && signedIn ? (
        <button
          type="button"
          onClick={item.repost.onToggle}
          aria-pressed={item.repost.active}
          className={cn('mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold', item.repost.active ? 'bg-olympic-green/15 text-olympic-green' : 'bg-secondary')}
        >
          <HandHeart className="size-5" />
          <span className="flex-1">{item.repost.active ? 'Lo apoyaste: ya lo ve más gente' : 'Apoyar y recompartir en BoostSport'}</span>
          {item.repost.active ? <Check className="size-4" /> : null}
        </button>
      ) : null}

      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Fuera de BoostSport</h3>
      <div className="mb-6 grid grid-cols-4 gap-3">
        <button type="button" onClick={copy} className="flex flex-col items-center gap-1.5 text-xs font-semibold">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary">{copied ? <Check className="size-5 text-olympic-green" /> : <Link2 className="size-5" />}</span>
          {copied ? '¡Copiado!' : 'Copiar link'}
        </button>
        {nets.map((n) => (
          <a key={n.label} href={n.href(item.text, item.url)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-xs font-semibold">
            <span className={cn('flex size-12 items-center justify-center rounded-full', n.className)}>
              {typeof n.icon === 'string' ? <span className="font-display text-lg font-bold leading-none">{n.icon}</span> : <n.icon className="size-5" />}
            </span>
            {n.label}
          </a>
        ))}
        {typeof navigator !== 'undefined' && 'share' in navigator ? (
          <button type="button" onClick={() => navigator.share({ title: 'BoostSport', text: item.text, url: item.url }).catch(() => {})} className="flex flex-col items-center gap-1.5 text-xs font-semibold">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <Copy className="size-5" />
            </span>
            Más opciones
          </button>
        ) : null}
      </div>

      {signedIn ? (
        <>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Enviar por mensaje</h3>
          <label className="mb-2 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Buscar un chat</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar un chat" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          {isLoading ? <Loader2 className="mx-auto my-4 size-5 animate-spin text-muted-foreground" /> : null}
          {chats && !chats.length ? <p className="py-3 text-sm text-muted-foreground">Cuando hagas match con alguien vas a poder mandárselo por chat.</p> : null}
          <ul className="flex flex-col gap-1">
            {visibleChats.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-1.5">
                <PartyAvatar party={c.other} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{c.other.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{c.other.subtitle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => send(c.id)}
                  disabled={sent.has(c.id) || sending === c.id}
                  className={cn('flex min-w-20 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold', sent.has(c.id) ? 'bg-secondary' : 'bg-olympic-blue text-olympic-white')}
                >
                  {sending === c.id ? <Loader2 className="size-3.5 animate-spin" /> : sent.has(c.id) ? 'Enviado' : 'Enviar'}
                </button>
              </li>
            ))}
          </ul>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </>
      ) : null}
    </Sheet>
  )
}
