'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, Copy, HandHeart, Link2, Loader2, Mail, MessageCircle, Send } from 'lucide-react'
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

/** A small sheet to share a post or a profile: chats and apps scroll sideways. */
export function ShareSheet({ item, onClose }: { item: ShareItem; onClose: () => void }) {
  const nav = useNav()
  const signedIn = nav.role !== 'invitado'
  const { data: chats } = useSWR(signedIn ? 'matches' : null, () => load('getMatches'))
  const [sent, setSent] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  async function send(matchId: number) {
    if (sent.has(matchId)) return
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

  const tile = 'flex w-16 shrink-0 snap-start flex-col items-center gap-1.5 text-[11px] font-semibold'
  const circle = 'flex size-12 items-center justify-center rounded-full'
  const row = 'flex snap-x gap-2 overflow-x-auto pb-1 no-scrollbar'

  return (
    <Sheet title="Compartir" onClose={onClose} modal>
      <p className="-mt-1 mb-3 line-clamp-1 text-xs text-muted-foreground">
        {item.title}
        {item.subtitle ? ` · ${item.subtitle}` : ''}
      </p>

      {signedIn && chats?.length ? (
        <>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Enviar a</h3>
          <div className={cn(row, 'mb-4')}>
            {chats.map((c) => (
              <button key={c.id} type="button" onClick={() => send(c.id)} disabled={sending === c.id} aria-label={`Enviar a ${c.other.name}`} className={tile}>
                <span className="relative">
                  <PartyAvatar party={c.other} className="size-12" />
                  {sending === c.id || sent.has(c.id) ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-olympic-black/55 text-olympic-white">
                      {sending === c.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-5" />}
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate text-center">{sent.has(c.id) ? 'Enviado' : c.other.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className={row}>
        {item.repost && signedIn ? (
          <button type="button" onClick={item.repost.onToggle} aria-pressed={item.repost.active} className={tile}>
            <span className={cn(circle, item.repost.active ? 'bg-olympic-yellow text-olympic-black' : 'bg-secondary')}>
              <HandHeart className="size-5" />
            </span>
            {item.repost.active ? 'Apoyado' : 'Apoyar'}
          </button>
        ) : null}
        <button type="button" onClick={copy} className={tile}>
          <span className={cn(circle, 'bg-secondary')}>{copied ? <Check className="size-5 text-olympic-green" /> : <Link2 className="size-5" />}</span>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
        {nets.map((n) => (
          <a key={n.label} href={n.href(item.text, item.url)} target="_blank" rel="noopener noreferrer" className={tile}>
            <span className={cn(circle, n.className)}>
              {typeof n.icon === 'string' ? <span className="font-display text-lg font-bold leading-none">{n.icon}</span> : <n.icon className="size-5" />}
            </span>
            {n.label}
          </a>
        ))}
        {canNativeShare ? (
          <button type="button" onClick={() => navigator.share({ title: 'BoostSport', text: item.text, url: item.url }).catch(() => {})} className={tile}>
            <span className={cn(circle, 'bg-secondary')}>
              <Copy className="size-5" />
            </span>
            Más
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </Sheet>
  )
}
