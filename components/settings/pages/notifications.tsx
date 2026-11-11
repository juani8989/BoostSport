'use client'

import { BellOff, Mail, MoonStar, Smartphone } from 'lucide-react'
import { NOTIFICATION_LABELS, type NotificationKey } from '@/lib/settings'
import { useSettings } from '@/components/settings/use-settings'
import { Field, Page, Section, Toggle, inputClass } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'

const KEYS = Object.keys(NOTIFICATION_LABELS) as NotificationKey[]

export function NotificationsPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const n = settings.notifications
  const paused = n.pauseAll

  return (
    <Page title="Notificaciones" onBack={back}>
      <Section>
        <Toggle icon={BellOff} label="Pausar todas" hint="No te avisamos de nada hasta que la desactives." checked={paused} onChange={(v) => update({ notifications: { pauseAll: v } })} />
        <Toggle
          icon={MoonStar}
          label="Modo descanso"
          hint={n.quietHours.enabled ? `Silencio de ${n.quietHours.from} a ${n.quietHours.to}` : 'Silenciá las notificaciones de noche.'}
          checked={n.quietHours.enabled}
          onChange={(v) => update({ notifications: { quietHours: { enabled: v } } })}
          disabled={paused}
        />
        {n.quietHours.enabled && !paused ? (
          <div className="grid grid-cols-2 gap-2 px-2">
            <Field label="Desde">
              <input type="time" value={n.quietHours.from} onChange={(e) => update({ notifications: { quietHours: { from: e.target.value } } })} className={inputClass} />
            </Field>
            <Field label="Hasta">
              <input type="time" value={n.quietHours.to} onChange={(e) => update({ notifications: { quietHours: { to: e.target.value } } })} className={inputClass} />
            </Field>
          </div>
        ) : null}
      </Section>

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Qué te avisamos</span>
        <span className="flex items-center gap-1">
          <Smartphone className="size-3.5" /> App
        </span>
        <span className="flex items-center gap-1">
          <Mail className="size-3.5" /> Email
        </span>
      </div>
      <ul className="flex flex-col">
        {KEYS.map((key) => (
          <li key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border px-4 py-3 last:border-b-0">
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px]">{NOTIFICATION_LABELS[key].label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{NOTIFICATION_LABELS[key].hint}</span>
            </span>
            <MiniSwitch label={`${NOTIFICATION_LABELS[key].label} en la app`} checked={n.push[key]} disabled={paused} onChange={(v) => update({ notifications: { push: { [key]: v } } })} />
            <MiniSwitch label={`${NOTIFICATION_LABELS[key].label} por email`} checked={n.email[key]} disabled={paused} onChange={(v) => update({ notifications: { email: { [key]: v } } })} />
          </li>
        ))}
      </ul>
    </Page>
  )
}

function MiniSwitch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={disabled ? 'opacity-40' : 'cursor-pointer'}>
      <span className="sr-only">{label}</span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative block h-6 w-10 rounded-full bg-muted-foreground/40 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-olympic-blue peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
      />
    </label>
  )
}
