'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { BadgeCheck, Download, KeyRound, Laptop, Mail, MonitorSmartphone, ShieldCheck, Smartphone, Trash2, UserRound } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { signOut } from '@/lib/auth-store'
import { closeSession, deleteMyAccount, exportMyData, getMySessions } from '@/app/actions/settings'
import { PartyAvatar } from '@/components/app/kit'
import { useSettings } from '@/components/settings/use-settings'
import { Empty, Field, Intro, Loading, Notice, Page, PrimaryButton, Row, Section, dateLabel, inputClass } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'
import { load } from '@/lib/load'

const roleName = { deportista: 'Deportista', empresa: 'Sponsor', evento: 'Institución' } as const

export function AccountCenter({ go, back }: PageProps) {
  const { account } = useSettings()
  if (!account) return <Page title="Centro de cuentas" onBack={back}><Loading /></Page>
  return (
    <Page title="Centro de cuentas" onBack={back}>
      <div className="flex flex-col items-center gap-2 px-4 py-6">
        <PartyAvatar party={account.party} className="size-20 text-2xl" />
        <p className="font-display text-xl font-semibold">{account.name}</p>
        <p className="text-sm text-muted-foreground">
          {roleName[account.role]} · desde {dateLabel(account.createdAt)}
        </p>
      </div>
      <Section title="Configuración de la cuenta">
        <Row icon={UserRound} label="Datos personales" hint="Nombre, email y tipo de cuenta" onClick={() => go('datos-personales')} />
        <Row icon={KeyRound} label="Contraseña y seguridad" hint="Cambiá tu contraseña" onClick={() => go('contrasena')} />
        <Row icon={MonitorSmartphone} label="Dónde iniciaste sesión" hint="Dispositivos con tu cuenta abierta" onClick={() => go('sesiones')} />
        <Row icon={BadgeCheck} label="Verificación" value={account.identityVerified ? 'Verificado' : account.emailVerified ? 'Email confirmado' : 'Pendiente'} onClick={() => go('verificacion')} />
      </Section>
      <Section title="Tu información">
        <Row icon={Download} label="Descargar tu información" hint="Una copia de todo lo que guardamos sobre vos" onClick={() => go('descargar')} />
        <Row icon={Trash2} label="Desactivar o eliminar la cuenta" danger onClick={() => go('eliminar')} />
      </Section>
    </Page>
  )
}

export function PersonalData({ back }: PageProps) {
  const { account, refresh } = useSettings()
  const [name, setName] = useState(account?.name ?? '')
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState(false)
  if (!account) return <Page title="Datos personales" onBack={back}><Loading /></Page>

  async function save() {
    if (name.trim().length < 2) return setStatus({ tone: 'error', text: 'El nombre debe tener al menos 2 letras.' })
    setPending(true)
    const res = await authClient.updateUser({ name: name.trim() })
    setPending(false)
    if (res.error) return setStatus({ tone: 'error', text: res.error.message ?? 'No se pudo guardar.' })
    setStatus({ tone: 'ok', text: 'Guardamos tu nombre.' })
    refresh()
  }

  return (
    <Page title="Datos personales" onBack={back}>
      <Section hint="BoostSport usa estos datos para tu cuenta. Lo que se ve en tu perfil lo editás desde Perfil → Editar.">
        <Field label="Nombre de la cuenta">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} />
        </Field>
        <Field label="Email" hint="Para cambiar el email escribinos desde Ayuda.">
          <input value={account.email} readOnly className={`${inputClass} opacity-70`} />
        </Field>
        <Row icon={Mail} label="Estado del email" value={account.emailVerified ? 'Confirmado' : 'Sin confirmar'} />
        <Row icon={UserRound} label="Tipo de cuenta" value={roleName[account.role]} />
        <Row icon={BadgeCheck} label="Cuenta creada" value={dateLabel(account.createdAt)} />
      </Section>
      {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
      <div className="px-4 pt-2">
        <PrimaryButton pending={pending} onClick={save} className="w-full">
          Guardar cambios
        </PrimaryButton>
      </div>
    </Page>
  )
}

export function PasswordPage({ back }: PageProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [revoke, setRevoke] = useState(true)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const strength = [next.length >= 8, /[A-Z]/.test(next), /\d/.test(next), /[^A-Za-z0-9]/.test(next), next.length >= 12].filter(Boolean).length
  const strengthLabel = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte', 'Muy fuerte'][strength]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (next.length < 8) return setStatus({ tone: 'error', text: 'La contraseña nueva debe tener al menos 8 caracteres.' })
    if (next !== repeat) return setStatus({ tone: 'error', text: 'Las contraseñas nuevas no coinciden.' })
    setPending(true)
    const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: revoke })
    setPending(false)
    if (res.error) return setStatus({ tone: 'error', text: res.error.message?.includes('password') ? 'La contraseña actual no es correcta.' : (res.error.message ?? 'No se pudo cambiar.') })
    setCurrent('')
    setNext('')
    setRepeat('')
    setStatus({ tone: 'ok', text: revoke ? 'Listo. Cerramos la sesión en tus otros dispositivos.' : 'Listo, cambiaste tu contraseña.' })
  }

  return (
    <Page title="Contraseña y seguridad" onBack={back}>
      <Intro icon={ShieldCheck} title="Cambiá tu contraseña">
        Usá al menos 8 caracteres, con mayúsculas, números y algún símbolo. No la reutilices en otros sitios.
      </Intro>
      <form onSubmit={submit} className="flex flex-col">
        <Field label="Contraseña actual">
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Contraseña nueva" hint={next ? `Seguridad: ${strengthLabel}` : undefined}>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i < strength ? (strength < 3 ? 'bg-olympic-red' : strength < 4 ? 'bg-olympic-yellow' : 'bg-olympic-green') : 'bg-secondary'}`} />
            ))}
          </span>
        </Field>
        <Field label="Repetí la contraseña nueva">
          <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-3 px-4 py-3 text-sm">
          <input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} className="size-4 accent-olympic-blue" />
          Cerrar sesión en los demás dispositivos
        </label>
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <div className="px-4 pt-2">
          <PrimaryButton type="submit" pending={pending} disabled={!current || !next} className="w-full">
            Cambiar contraseña
          </PrimaryButton>
        </div>
      </form>
    </Page>
  )
}

function describeDevice(ua: string) {
  if (!ua) return { name: 'Dispositivo desconocido', icon: Laptop }
  const mobile = /iPhone|Android|Mobile/i.test(ua)
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Otro sistema'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  return { name: `${browser} en ${os}`, icon: mobile ? Smartphone : Laptop }
}

export function SessionsPage({ back }: PageProps) {
  const { data, mutate, isLoading } = useSWR('sessions', () => load('getMySessions'))
  return (
    <Page title="Dónde iniciaste sesión" onBack={back}>
      <Section hint="Si no reconocés un dispositivo, cerrá esa sesión y cambiá tu contraseña.">
        {isLoading ? <Loading /> : null}
        {data?.map((s) => {
          const d = describeDevice(s.userAgent)
          return (
            <Row
              key={s.id}
              icon={d.icon}
              label={d.name}
              hint={`${s.current ? 'Este dispositivo · ' : ''}Activa ${dateLabel(s.updatedAt)}${s.ipAddress ? ` · IP ${s.ipAddress}` : ''}`}
              trailing={
                s.current ? (
                  <span className="text-xs font-semibold text-olympic-green">Actual</span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await closeSession(s.id)
                      mutate()
                    }}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                )
              }
            />
          )
        })}
      </Section>
      {data && data.filter((s) => !s.current).length > 0 ? (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={async () => {
              await authClient.revokeOtherSessions()
              mutate()
            }}
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-destructive"
          >
            Cerrar todas las demás sesiones
          </button>
        </div>
      ) : null}
    </Page>
  )
}

export function DownloadPage({ back }: PageProps) {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function download() {
    setPending(true)
    const res = await exportMyData()
    setPending(false)
    if (!res.ok) return
    const blob = new Blob([res.json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `boostsport-mis-datos-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDone(true)
  }

  return (
    <Page title="Descargar tu información" onBack={back}>
      <Intro icon={Download} title="Una copia de tus datos">
        Incluye tu cuenta, tu perfil, tu configuración, publicaciones, comentarios, reacciones, a quién seguís, tus matches y los mensajes de tus chats.
      </Intro>
      {done ? <Notice tone="ok">Listo. El archivo se descargó en tu dispositivo.</Notice> : null}
      <div className="px-4">
        <PrimaryButton pending={pending} onClick={download} className="w-full">
          Descargar archivo (JSON)
        </PrimaryButton>
      </div>
    </Page>
  )
}

export function DeletePage({ back }: PageProps) {
  const { update, settings } = useSettings()
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setPending(true)
    const res = await deleteMyAccount(confirm)
    setPending(false)
    if (!res.ok) return setError(res.error)
    signOut()
  }

  return (
    <Page title="Desactivar o eliminar" onBack={back}>
      <Section title="Pausar tu presencia">
        <Row
          icon={ShieldCheck}
          label={settings.privacy.showInMatch ? 'Ocultarme de Match y búsquedas' : 'Volver a aparecer en Match y búsquedas'}
          hint="Tu cuenta sigue activa, pero las marcas y deportistas nuevos no te encuentran."
          onClick={() => {
            const on = !settings.privacy.showInMatch
            update({ privacy: { showInMatch: on, showInSearch: on, showInAiScout: on } })
          }}
        />
      </Section>
      <Section title="Eliminar la cuenta">
        <p className="px-4 py-2 text-sm leading-relaxed text-muted-foreground">
          Se borran para siempre tu perfil, publicaciones, comentarios, seguidores, matches y mensajes. No se puede deshacer. Antes podés descargar tu información.
        </p>
        <Field label="Escribí ELIMINAR para confirmar">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" className={inputClass} />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="px-4 pt-2">
          <button
            type="button"
            disabled={confirm !== 'ELIMINAR' || pending}
            onClick={remove}
            className="w-full rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {pending ? 'Eliminando…' : 'Eliminar mi cuenta para siempre'}
          </button>
        </div>
      </Section>
    </Page>
  )
}

export function VerificationPage({ back }: PageProps) {
  const { account } = useSettings()
  if (!account) return <Page title="Verificación" onBack={back}><Loading /></Page>
  const steps = [
    { label: 'Email confirmado', done: account.emailVerified },
    ...(account.role === 'deportista' ? [{ label: 'Identidad verificada con selfie', done: account.identityVerified }] : []),
    { label: `Perfil completo (${account.completeness} %)`, done: account.completeness >= 100 },
  ]
  return (
    <Page title="Verificación" onBack={back}>
      <Intro icon={BadgeCheck} title="Generá confianza">
        Las marcas e instituciones priorizan perfiles verificados y completos. Cada paso suma visibilidad en Match.
      </Intro>
      <Section>
        {steps.map((s) => (
          <Row key={s.label} icon={s.done ? BadgeCheck : ShieldCheck} label={s.label} value={s.done ? 'Listo' : 'Pendiente'} />
        ))}
      </Section>
      {account.missing.length ? (
        <Section title="Te falta completar">
          {account.missing.map((m) => (
            <Row key={m} label={m} />
          ))}
        </Section>
      ) : (
        <Empty icon={BadgeCheck} title="¡Todo completo!">Tu perfil tiene todo lo que buscan las marcas.</Empty>
      )}
    </Page>
  )
}
