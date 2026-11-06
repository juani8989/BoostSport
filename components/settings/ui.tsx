'use client'

import { ArrowLeft, Check, ChevronRight, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Page({ title, onBack, children, action }: { title: string; onBack: () => void; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background animate-in slide-in-from-right-8 fade-in duration-200 motion-reduce:animate-none">
      <header className="flex items-center gap-2 border-b border-border px-2 pb-3 pt-5">
        <button type="button" onClick={onBack} aria-label="Volver" className="flex size-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</h2>
        {action}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-10">{children}</div>
    </div>
  )
}

export function Section({ title, children, hint }: { title?: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="flex flex-col border-b border-border py-2 last:border-b-0">
      {title ? <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3> : null}
      {children}
      {hint ? <p className="px-4 pb-2 pt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </section>
  )
}

export function Row({
  icon: Icon,
  label,
  hint,
  value,
  onClick,
  danger,
  badge,
  trailing,
}: {
  icon?: LucideIcon
  label: string
  hint?: string
  value?: string
  onClick?: () => void
  danger?: boolean
  badge?: string | number
  trailing?: React.ReactNode
}) {
  const content = (
    <>
      {Icon ? <Icon className={cn('size-6 shrink-0', danger ? 'text-destructive' : 'text-foreground')} strokeWidth={1.75} /> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('text-[15px] leading-snug', danger && 'font-semibold text-destructive')}>{label}</span>
        {hint ? <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
      </span>
      {badge !== undefined && badge !== 0 ? <span className="rounded-full bg-olympic-red px-2 py-0.5 text-[11px] font-bold text-olympic-white">{badge}</span> : null}
      {value ? <span className="max-w-[40%] truncate text-sm text-muted-foreground">{value}</span> : null}
      {trailing ?? (onClick ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null)}
    </>
  )
  if (!onClick) return <div className="flex items-center gap-4 px-4 py-3">{content}</div>
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/60 active:bg-secondary">
      {content}
    </button>
  )
}

export function Toggle({ label, hint, checked, onChange, icon: Icon, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; icon?: LucideIcon; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-4 px-4 py-3', disabled && 'cursor-not-allowed opacity-50')}>
      {Icon ? <Icon className="size-6 shrink-0" strokeWidth={1.75} /> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] leading-snug">{label}</span>
        {hint ? <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/40 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-olympic-blue peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
      />
    </label>
  )
}

export function Choice<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)} className="flex items-center gap-4 px-4 py-3 text-left hover:bg-secondary/60">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px]">{o.label}</span>
              {o.hint ? <span className="text-xs leading-relaxed text-muted-foreground">{o.hint}</span> : null}
            </span>
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border-2', active ? 'border-olympic-blue bg-olympic-blue text-olympic-white' : 'border-muted-foreground/50')}>
              {active ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Intro({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-foreground">
        <Icon className="size-8" strokeWidth={1.5} />
      </span>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-14 text-center">
      <Icon className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <p className="font-semibold">{title}</p>
      {children ? <p className="text-sm leading-relaxed text-muted-foreground">{children}</p> : null}
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando" />
    </div>
  )
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex border-b border-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('flex-1 border-b-2 py-3 text-sm font-semibold transition-colors', o.value === value ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 px-4 py-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export const inputClass = 'w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function PrimaryButton({ children, pending, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button {...props} disabled={pending || props.disabled} className={cn('flex items-center justify-center gap-2 rounded-xl bg-olympic-blue px-4 py-3 text-sm font-bold text-olympic-white disabled:opacity-50', className)}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'error'; children: React.ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mx-4 my-2 rounded-xl px-4 py-3 text-sm leading-relaxed',
        tone === 'ok' && 'bg-olympic-green/15 text-olympic-green',
        tone === 'error' && 'bg-destructive/15 text-destructive',
        tone === 'info' && 'bg-secondary text-muted-foreground',
      )}
    >
      {children}
    </p>
  )
}

export function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
