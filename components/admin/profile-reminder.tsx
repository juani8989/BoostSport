'use client'

import { useState } from 'react'
import { Check, Mail, MailCheck } from 'lucide-react'
import { adminRemindProfile } from '@/app/actions/admin'
import { AdminTextarea, Button, Modal, useAdminFeedback } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

export type MissingItem = { key: string; label: string }

export function progressTone(percent: number) {
  return percent >= 70 ? 'bg-olympic-green' : percent >= 40 ? 'bg-olympic-yellow' : 'bg-olympic-red'
}

/** Progress bar that opens the list of missing items; used in the user tables. */
export function ProfileProgress({ percent, missing, onOpen }: { percent: number; missing: MissingItem[]; onOpen: () => void }) {
  const complete = missing.length === 0
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={complete}
      title={complete ? 'Perfil completo' : `Falta: ${missing.map((m) => m.label).join(', ')}`}
      className="group flex flex-col items-start gap-1 rounded-lg p-1 text-left enabled:hover:bg-secondary disabled:cursor-default"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
          <span className={cn('block h-full rounded-full', progressTone(percent))} style={{ width: `${percent}%` }} />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
      </span>
      <span className={cn('text-[11px] font-semibold', complete ? 'text-olympic-green' : 'text-muted-foreground group-hover:text-foreground')}>
        {complete ? 'Completo' : `Faltan ${missing.length} · ver`}
      </span>
    </button>
  )
}

/** Lists what the profile is missing and emails the person the items the admin keeps checked. */
export function ProfileReminderModal({ userId, name, email, percent, missing, onClose }: { userId: string; name: string; email: string; percent: number; missing: MissingItem[]; onClose: () => void }) {
  const { toast } = useAdminFeedback()
  const [picked, setPicked] = useState<Set<string>>(() => new Set(missing.map((m) => m.key)))
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function send() {
    setPending(true)
    setError(null)
    const res = await adminRemindProfile(userId, { keys: [...picked], note })
    setPending(false)
    if (!res.ok) return setError(res.error)
    toast(`Mail enviado a ${email}`)
    onClose()
  }

  return (
    <Modal title={`Perfil de ${name} al ${percent}%`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className={cn('h-full rounded-full', progressTone(percent))} style={{ width: `${percent}%` }} />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground">Le falta ({missing.length}). Marcá lo que querés pedirle:</p>
          <ul className="flex flex-col gap-1">
            {missing.map((m) => {
              const on = picked.has(m.key)
              return (
                <li key={m.key}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(m.key)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className={cn('flex size-5 items-center justify-center rounded-md border-2', on ? 'border-olympic-yellow bg-olympic-yellow text-black' : 'border-border')}>
                      {on ? <Check className="size-3.5" /> : null}
                    </span>
                    {m.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <AdminTextarea label="Nota personal (opcional)" placeholder="Ej: ¡Hola! Estamos por mostrar tu perfil a una marca de indumentaria…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />

        <p className="text-xs leading-relaxed text-muted-foreground">
          <MailCheck className="mr-1.5 inline size-3.5 align-[-2px]" />
          Se envía a <strong className="break-all text-foreground">{email}</strong> con la lista y un botón para entrar a completar.
        </p>
        {error ? <p className="text-sm text-olympic-red">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" pending={pending} disabled={picked.size === 0} onClick={send}>
            <Mail className="size-4" /> Mandar mail ({picked.size})
          </Button>
        </div>
      </div>
    </Modal>
  )
}
