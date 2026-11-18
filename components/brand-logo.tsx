'use client'

import { cn } from '@/lib/utils'

export function BrandLogo({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tone === 'dark' ? '/brand/logo-oscuro.svg' : '/brand/logo-claro.svg'}
      alt="BoostSport"
      width={110}
      height={32}
      className={cn('h-8 w-auto', className)}
    />
  )
}

export function BrandMark({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tone === 'dark' ? '/brand/isotipo-oscuro.svg' : '/brand/isotipo-claro.svg'}
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn('size-8', className)}
    />
  )
}

export function BrandLine({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('h-0.5 w-full bg-brand-line', className)} />
}

/**
 * Logo for the app header: just the triangle, with no background of its own, so it sits
 * on the light and dark themes (and over photos) alike.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="BoostSport" className={cn('inline-flex items-center', className)}>
      <BrandMark className="size-7" />
    </span>
  )
}

/** The logo as a button: tapping it reloads the page. */
export function RefreshLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      aria-label="BoostSport · Recargar la página"
      title="Recargar"
      className={cn('flex items-center justify-center rounded-full transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olympic-blue', className)}
    >
      {compact ? <BrandMark /> : <BrandWordmark />}
    </button>
  )
}
