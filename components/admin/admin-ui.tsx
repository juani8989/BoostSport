'use client'

import { createContext, useCallback, useContext, useEffect, useId, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import type { Role } from '@/lib/profile-types'
import { cn } from '@/lib/utils'

export const roleMeta: Record<Role, { label: string; plural: string; dot: string; soft: string; solid: string; text: string }> = {
  deportista: { label: 'Deportista', plural: 'Deportistas', dot: 'bg-olympic-blue', soft: 'bg-olympic-blue/15 text-olympic-blue', solid: 'bg-olympic-blue text-white', text: 'text-olympic-blue' },
  empresa: { label: 'Sponsor', plural: 'Sponsors', dot: 'bg-olympic-yellow', soft: 'bg-olympic-yellow/15 text-olympic-yellow', solid: 'bg-olympic-yellow text-black', text: 'text-olympic-yellow' },
  evento: { label: 'Institución', plural: 'Instituciones', dot: 'bg-olympic-green', soft: 'bg-olympic-green/15 text-olympic-green', solid: 'bg-olympic-green text-white', text: 'text-olympic-green' },
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground/60 disabled:opacity-60'

export function AdminField({ label, hint, className, ...props }: { label: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function AdminTextarea({ label, className, ...props }: { label: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <textarea id={id} rows={3} className={cn(inputClass, 'resize-y leading-relaxed')} {...props} />
    </div>
  )
}

export function AdminSelect({
  label,
  options,
  className,
  ...props
}: { label: string; options: { value: string; label: string }[]; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select id={id} className={inputClass} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-olympic-green' : 'bg-secondary')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

export function Button({
  variant = 'secondary',
  size = 'md',
  pending,
  className,
  children,
  ...props
}: { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; pending?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={pending || props.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-foreground text-background hover:bg-foreground/90',
        variant === 'secondary' && 'border border-border bg-card hover:bg-secondary',
        variant === 'danger' && 'bg-olympic-red text-white hover:bg-olympic-red/90',
        variant === 'ghost' && 'hover:bg-secondary',
        className,
      )}
      {...props}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function IconButton({ label, tone, className, children, ...props }: { label: string; tone?: 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        tone === 'danger' && 'hover:bg-olympic-red/15 hover:text-olympic-red',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Avatar({ name, image, role, className }: { name: string; image?: string | null; role: Role | null; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold ring-2',
        role === 'deportista' ? 'ring-olympic-blue' : role === 'empresa' ? 'ring-olympic-yellow' : role === 'evento' ? 'ring-olympic-green' : 'ring-border',
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={image} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden>{initials || '?'}</span>
      )}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role | null }) {
  if (!role) return <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">Sin perfil</span>
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', roleMeta[role].soft)}>{roleMeta[role].label}</span>
}

export function Section({ title, description, actions, children, className }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <section role="dialog" aria-modal="true" aria-label={title} className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-card sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </section>
    </div>
  )
}

type ConfirmRequest = { title: string; body: string; confirmLabel: string; danger?: boolean; typeToConfirm?: string; onConfirm: () => Promise<void> | void }
type ToastItem = { id: number; message: string; tone: 'ok' | 'error' }

const AdminFeedback = createContext<{ confirm: (r: ConfirmRequest) => void; toast: (message: string, tone?: 'ok' | 'error') => void }>({
  confirm: () => {},
  toast: () => {},
})

export const useAdminFeedback = () => useContext(AdminFeedback)

export function AdminFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const confirm = useCallback((r: ConfirmRequest) => {
    setTyped('')
    setRequest(r)
  }, [])

  const blocked = !!request?.typeToConfirm && typed.trim() !== request.typeToConfirm

  return (
    <AdminFeedback.Provider value={{ confirm, toast }}>
      {children}
      {request ? (
        <Modal title={request.title} onClose={() => !pending && setRequest(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              {request.danger ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-olympic-red" /> : null}
              <p className="text-sm leading-relaxed text-muted-foreground">{request.body}</p>
            </div>
            {request.typeToConfirm ? (
              <AdminField label={`Escribí "${request.typeToConfirm}" para confirmar`} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            ) : null}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRequest(null)} disabled={pending}>
                Cancelar
              </Button>
              <Button
                variant={request.danger ? 'danger' : 'primary'}
                pending={pending}
                disabled={blocked}
                onClick={async () => {
                  setPending(true)
                  try {
                    await request.onConfirm()
                    setRequest(null)
                  } finally {
                    setPending(false)
                  }
                }}
              >
                {request.confirmLabel}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col gap-2">
        {toasts.map((t) => (
          <p
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg animate-in slide-in-from-bottom-2',
              t.tone === 'ok' ? 'border-olympic-green/40 bg-card' : 'border-olympic-red/40 bg-card text-olympic-red',
            )}
          >
            {t.tone === 'ok' ? <CheckCircle2 className="size-4 text-olympic-green" /> : <AlertTriangle className="size-4" />}
            {t.message}
          </p>
        ))}
      </div>
    </AdminFeedback.Provider>
  )
}

export function formatDate(iso: string | null, withTime = false) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-AR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(iso))
}
