import { cn } from '@/lib/utils'

type Network = 'instagram' | 'tiktok' | 'x' | 'youtube'

/** Simple outlines of each network's logo (the icon library doesn't ship brand logos). */
function Logo({ network, className }: { network: Network; className?: string }) {
  const common = { className: cn('size-4 shrink-0', className), viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (network === 'instagram')
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    )
  if (network === 'youtube')
    return (
      <svg {...common}>
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <path d="m10 9 5 3-5 3z" fill="currentColor" />
      </svg>
    )
  if (network === 'x')
    return (
      <svg {...common}>
        <path d="M4 4l16 16M20 4 4 20" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.5 2.5 4.5 5 5" />
    </svg>
  )
}

const meta: Record<Network, { label: string; url: (h: string) => string; className: string }> = {
  instagram: { label: 'Instagram', url: (h) => `https://www.instagram.com/${h}/`, className: 'text-[#e1306c]' },
  tiktok: { label: 'TikTok', url: (h) => `https://www.tiktok.com/@${h}`, className: 'text-foreground' },
  x: { label: 'X', url: (h) => `https://x.com/${h}`, className: 'text-foreground' },
  youtube: { label: 'YouTube', url: (h) => `https://www.youtube.com/@${h}`, className: 'text-[#ff0033]' },
}

/** "@juanig.arg", "juanig.arg" or a full link → the user name, or null if it isn't one. */
function handleOf(network: Network, raw: string) {
  const value = raw.trim()
  if (!value) return null
  const fromUrl = /^https?:\/\//i.test(value) ? value.replace(/^https?:\/\/(www\.)?[^/]+\/@?/i, '').split(/[/?#]/)[0] : value
  const handle = fromUrl.replace(/^@/, '')
  return /^[\w.-]{1,40}$/.test(handle) ? handle : null
}

/**
 * The social accounts the person added to their profile, each one linking to it. The follower
 * count will appear here once the account is connected for real (not just typed in).
 */
export function SocialLinks({ socials, followers, className }: { socials?: Partial<Record<Network, string>>; followers?: Partial<Record<Network, number>>; className?: string }) {
  const items = (Object.keys(meta) as Network[])
    .map((network) => ({ network, handle: handleOf(network, socials?.[network] ?? '') }))
    .filter((x): x is { network: Network; handle: string } => !!x.handle)
  if (!items.length) return null
  return (
    <ul aria-label="Redes sociales" className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map(({ network, handle }) => (
        <li key={network} className="group relative">
          <a
            href={meta[network].url(handle)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
          >
            <Logo network={network} className={meta[network].className} />
            <span className="sr-only">{meta[network].label}: </span>
            {handle}
          </a>
          {/* On hover or focus: the account and its followers (once the account is connected). */}
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-56 -translate-x-1/2 flex-col gap-0.5 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs shadow-xl group-hover:flex group-focus-within:flex"
          >
            <span className="font-bold">
              {meta[network].label} · {handle}
            </span>
            {typeof followers?.[network] === 'number' ? (
              <span>{new Intl.NumberFormat('es-AR').format(followers[network]!)} seguidores</span>
            ) : (
              <span className="text-muted-foreground">Los seguidores se ven cuando la cuenta está vinculada.</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
