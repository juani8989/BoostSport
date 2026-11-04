'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { BadgeCheck, Braces, CalendarDays, CircleCheck, CircleDashed, Mail, Globe, Handshake, KeyRound, Loader2, LogOut, MapPin, MessageCircle, Newspaper, Pencil, ShieldOff, Trash2, UserCog, X } from 'lucide-react'
import {
  adminChangeRole,
  adminDeleteComment,
  adminDeleteMatch,
  adminDeletePost,
  adminDeleteUsers,
  adminRevokeSessions,
  adminSetPassword,
  adminUpdateAccount,
  adminUpdateProfile,
  getAdminUser,
  type AdminUserDetail as Detail,
} from '@/app/actions/admin'
import { profileDisplayName, profileImage } from '@/lib/admin-profiles'
import { ROLES, type AthleteProfile, type OrgProfile, type Role } from '@/lib/profile-types'
import { AdminField, AdminSelect, Avatar, Button, IconButton, RoleBadge, Section, Toggle, formatDate, roleMeta, useAdminFeedback } from '@/components/admin/admin-ui'
import { AdminProfileForm } from '@/components/admin/admin-profile-form'
import { refreshAdminData } from '@/components/admin/admin-user-list'
import { ProfileReminderModal, progressTone } from '@/components/admin/profile-reminder'
import { completenessOf, profileChecklist } from '@/lib/profile-checklist'
import { cn } from '@/lib/utils'

type Tab = 'perfil' | 'editar' | 'cuenta' | 'actividad' | 'avanzado'

const tabs: { id: Tab; label: string; icon: typeof Pencil }[] = [
  { id: 'perfil', label: 'Perfil', icon: UserCog },
  { id: 'editar', label: 'Editar perfil', icon: Pencil },
  { id: 'cuenta', label: 'Cuenta y acceso', icon: KeyRound },
  { id: 'actividad', label: 'Actividad', icon: Newspaper },
  { id: 'avanzado', label: 'Avanzado', icon: Braces },
]

export function AdminUserDetail({ userId, initialTab = 'perfil', selfId, onClose }: { userId: string; initialTab?: 'perfil' | 'editar'; selfId: string; onClose: () => void }) {
  const { data, isLoading } = useSWR(`admin:user:${userId}`, () => getAdminUser(userId))
  const [tab, setTab] = useState<Tab>(initialTab)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const role = data?.role && data.role !== 'admin' ? data.role : null
  const name = data ? profileDisplayName(data.profile, data.user.name) : ''

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section role="dialog" aria-modal="true" aria-label={name || 'Usuario'} className="relative flex h-full w-full max-w-4xl flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-center gap-4 border-b border-border px-5 py-4 sm:px-6">
          {data ? <Avatar name={name} image={profileImage(data.profile) ?? data.user.image} role={role} className="size-12 text-sm" /> : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold">{data ? name : 'Cargando…'}</h2>
            {data ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <RoleBadge role={role} />
                <span className="truncate">{data.user.email}</span>
              </div>
            ) : null}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="size-9">
            <X className="size-5" />
          </IconButton>
        </header>

        <nav aria-label="Secciones del usuario" className="flex gap-1 overflow-x-auto border-b border-border px-3 no-scrollbar sm:px-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                tab === id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando usuario" />
            </div>
          ) : !data ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Este usuario ya no existe.</p>
          ) : tab === 'perfil' ? (
            <ProfileView data={data} onEdit={() => setTab('editar')} />
          ) : tab === 'editar' ? (
            <EditProfile data={data} onSaved={() => setTab('perfil')} />
          ) : tab === 'cuenta' ? (
            <AccountTab data={data} isSelf={data.user.id === selfId} onDeleted={onClose} />
          ) : tab === 'actividad' ? (
            <ActivityTab data={data} />
          ) : (
            <AdvancedTab data={data} />
          )}
        </div>
      </section>
    </div>
  )
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line text-sm">{value?.trim() ? value : <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function ProfileView({ data, onEdit }: { data: Detail; onEdit: () => void }) {
  const p = data.profile
  const stats = [
    { label: 'Seguidores', value: data.followers },
    { label: 'Sigue a', value: data.following },
    { label: 'Publicaciones', value: data.posts.length },
    { label: 'Matches', value: data.matches.length },
  ]

  if (!p) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Este usuario no tiene perfil. Asignale una categoría desde «Cuenta y acceso» o creale uno.</p>
        <Button variant="primary" onClick={onEdit}>
          Crear perfil
        </Button>
      </div>
    )
  }

  const image = profileImage(p)
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className={cn('h-24', p.kind === 'deportista' ? 'bg-olympic-blue/30' : p.kind === 'empresa' ? 'bg-olympic-yellow/30' : 'bg-olympic-green/30')} />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-6">
          <span className="-mt-12 flex size-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-secondary font-display text-2xl font-semibold">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={image} alt="" className="size-full object-cover" />
            ) : (
              profileDisplayName(p, data.user.name).slice(0, 2).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
              {profileDisplayName(p, data.user.name)}
              {p.kind === 'deportista' && p.identityVerified ? <BadgeCheck className="size-5 text-olympic-blue" aria-label="Identidad verificada" /> : null}
            </h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{p.kind === 'deportista' ? p.discipline : p.category}</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {p.kind === 'deportista' ? p.country : [p.city, p.country].filter(Boolean).join(', ')}
              </span>
              {p.kind === 'deportista' && p.age ? <span>{p.age} años</span> : null}
              {p.kind !== 'deportista' && p.website ? (
                <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline underline-offset-2">
                  <Globe className="size-3.5" /> {p.website}
                </a>
              ) : null}
            </p>
          </div>
          <Button variant="primary" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
        </div>
        <dl className="grid grid-cols-4 border-t border-border">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <dd className="font-display text-xl font-semibold tabular-nums">{s.value}</dd>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <ProfileCompleteness data={data} />

      {p.kind === 'deportista' ? <AthleteFacts p={p} /> : <OrgFacts p={p} />}
    </div>
  )
}

function ProfileCompleteness({ data }: { data: Detail }) {
  const [open, setOpen] = useState(false)
  const items = profileChecklist(data.profile)
  const percent = completenessOf(items)
  const missing = items.filter((i) => !i.done)
  return (
    <Section
      title={`Perfil al ${percent}%`}
      description={missing.length ? `Le faltan ${missing.length} de ${items.length} puntos` : 'Tiene todo completo'}
      actions={
        missing.length ? (
          <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
            <Mail className="size-3.5" /> Pedirle por mail
          </Button>
        ) : null
      }
    >
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', progressTone(percent))} style={{ width: `${percent}%` }} />
      </div>
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key} className={cn('flex items-center gap-2 text-sm', i.done ? 'text-muted-foreground' : 'font-semibold')}>
            {i.done ? <CircleCheck className="size-4 shrink-0 text-olympic-green" /> : <CircleDashed className="size-4 shrink-0 text-olympic-yellow" />}
            {i.label}
          </li>
        ))}
      </ul>
      {open ? (
        <ProfileReminderModal
          userId={data.user.id}
          name={profileDisplayName(data.profile, data.user.name)}
          email={data.user.email}
          percent={percent}
          missing={missing.map(({ key, label }) => ({ key, label }))}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Section>
  )
}

function AthleteFacts({ p }: { p: AthleteProfile }) {
  return (
    <>
      <Section title="Sobre el deportista">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Resumen" value={p.summary} />
          <Fact label="Objetivos" value={p.goals} />
          <Fact label="Logros" value={p.achievements} />
          <Fact label="Reconocimientos" value={p.recognitions} />
          <Fact label="Estudios" value={p.studies} />
          <Fact label="Necesita" value={[p.needs.join(', '), p.needsDetail].filter(Boolean).join('\n')} />
          <Fact label="Redes" value={Object.entries(p.socials).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')} />
          <Fact label="Wikipedia" value={p.wikiUrl} />
          <Fact label="Atleta reconocido" value={p.famous ? 'Sí' : 'No'} />
          <Fact label="Identidad verificada" value={p.identityVerified ? 'Sí' : 'No'} />
        </dl>
      </Section>
      {p.timeline.length ? (
        <Section title="Trayectoria">
          <ol className="flex flex-col gap-3 border-l border-border pl-4">
            {p.timeline.map((t, i) => (
              <li key={i} className="text-sm">
                <span className="font-display font-semibold">{t.year}</span> — {t.text}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
      {p.gallery?.length ? (
        <Section title="Galería">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.gallery.map((g, i) => (
              <figure key={i} className="overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src={g.src} alt={g.caption} className="aspect-square w-full object-cover" />
                <figcaption className="truncate px-2 py-1.5 text-xs text-muted-foreground">{g.caption}</figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ) : null}
      {p.selfie ? (
        <Section title="Selfie de verificación">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={p.selfie} alt="Selfie de verificación" className="max-h-64 rounded-xl border border-border" />
        </Section>
      ) : null}
    </>
  )
}

function OrgFacts({ p }: { p: OrgProfile }) {
  return (
    <>
      <Section title={p.kind === 'empresa' ? 'Sobre el sponsor' : 'Sobre la institución'}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Descripción" value={p.description} />
          <Fact label="Busca" value={p.lookingFor} />
          {p.kind === 'evento' ? <Fact label="Fecha del evento" value={p.eventDate} /> : null}
          {p.eventInfo ? (
            <>
              <Fact label="Lugar" value={p.eventInfo.place} />
              <Fact label="Distancia / formato" value={p.eventInfo.distance} />
              <Fact label="Requisitos" value={p.eventInfo.requirements} />
              <Fact label="Inscripción" value={p.eventInfo.signup} />
              <Fact label="Alcance" value={p.eventInfo.reach} />
            </>
          ) : null}
        </dl>
      </Section>
      {p.sponsored?.length ? (
        <Section title="Deportistas sponsoreados">
          <ul className="grid gap-2 sm:grid-cols-2">
            {p.sponsored.map((s, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar name={s.name} image={s.image} role="deportista" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.discipline} · desde {s.since}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {p.merch?.length ? (
        <Section title="Productos">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.merch.map((m, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-border">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={m.image} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square bg-secondary" />
                )}
                <p className="truncate px-2 pt-1.5 text-xs font-semibold">{m.name}</p>
                <p className="px-2 pb-1.5 text-xs text-muted-foreground">{m.price}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  )
}

function EditProfile({ data, onSaved }: { data: Detail; onSaved: () => void }) {
  const { toast } = useAdminFeedback()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const role = data.role && data.role !== 'admin' ? data.role : null

  if (!data.profile || !role) {
    return <MissingProfile data={data} />
  }

  return (
    <AdminProfileForm
      initial={data.profile}
      pending={pending}
      error={error}
      onSubmit={async (next) => {
        setPending(true)
        setError(null)
        const res = await adminUpdateProfile(data.user.id, next)
        setPending(false)
        if (!res.ok) return setError(res.error)
        await refreshAdminData()
        toast('Perfil guardado')
        onSaved()
      }}
    />
  )
}

function MissingProfile({ data }: { data: Detail }) {
  const { toast } = useAdminFeedback()
  const [role, setRole] = useState<Role>('deportista')
  const [pending, setPending] = useState(false)
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-8">
      <p className="text-sm text-muted-foreground">Elegí la categoría y se crea un perfil vacío para completar.</p>
      <AdminSelect label="Categoría" value={role} onChange={(e) => setRole(e.target.value as Role)} options={ROLES.map((r) => ({ value: r, label: roleMeta[r].label }))} />
      <Button
        variant="primary"
        pending={pending}
        onClick={async () => {
          setPending(true)
          const res = await adminChangeRole(data.user.id, role)
          setPending(false)
          if (!res.ok) return toast(res.error, 'error')
          await refreshAdminData()
          toast('Perfil creado')
        }}
      >
        Crear perfil
      </Button>
    </div>
  )
}

function AccountTab({ data, isSelf, onDeleted }: { data: Detail; isSelf: boolean; onDeleted: () => void }) {
  const { confirm, toast } = useAdminFeedback()
  const [name, setName] = useState(data.user.name)
  const [email, setEmail] = useState(data.user.email)
  const [verified, setVerified] = useState(data.user.emailVerified)
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const role = data.role && data.role !== 'admin' ? data.role : null

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setPending(key)
    const res = await fn()
    setPending(null)
    if (!res.ok) return toast(res.error ?? 'No se pudo completar.', 'error')
    await refreshAdminData()
    toast(ok)
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Datos de la cuenta" description="Nombre de usuario, email de acceso y verificación">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Nombre de la cuenta" value={name} onChange={(e) => setName(e.target.value)} />
          <AdminField label="Email de acceso" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Toggle label="Email verificado" checked={verified} onChange={setVerified} />
          <div className="flex items-end justify-end">
            <Button variant="primary" pending={pending === 'account'} onClick={() => run('account', () => adminUpdateAccount(data.user.id, { name, email, emailVerified: verified }), 'Cuenta actualizada')}>
              Guardar cuenta
            </Button>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <Fact label="Alta" value={formatDate(data.user.createdAt, true)} />
          <Fact label="Última modificación de perfil" value={formatDate(data.profileUpdatedAt, true)} />
          <Fact label="ID" value={data.user.id} />
        </dl>
      </Section>

      <Section title="Categoría" description="Mové al usuario entre Deportistas, Sponsors e Instituciones">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <Button
              key={r}
              variant={role === r ? 'primary' : 'secondary'}
              disabled={role === r || isSelf}
              pending={pending === `role:${r}`}
              onClick={() =>
                confirm({
                  title: `Mover a ${roleMeta[r].plural}`,
                  body: 'Se conservan los datos que tienen equivalente (nombre, país, disciplina o rubro, foto). El resto queda vacío para completar.',
                  confirmLabel: 'Mover',
                  onConfirm: () => run(`role:${r}`, () => adminChangeRole(data.user.id, r), `Movido a ${roleMeta[r].plural}`),
                })
              }
            >
              <span className={cn('size-2 rounded-full', roleMeta[r].dot)} /> {roleMeta[r].label}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Contraseña" description={data.hasPassword ? 'El usuario entra con email y contraseña' : 'Este usuario todavía no tiene contraseña'}>
        <div className="flex flex-wrap items-end gap-2">
          <AdminField label="Nueva contraseña" type="text" value={password} onChange={(e) => setPassword(e.target.value)} hint="Al cambiarla se cierran todas sus sesiones." className="min-w-56 flex-1" />
          <Button
            className="mb-6"
            onClick={() => {
              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
              setPassword(Array.from(crypto.getRandomValues(new Uint8Array(14)), (b) => chars[b % chars.length]).join(''))
            }}
          >
            Generar
          </Button>
          <Button
            className="mb-6"
            variant="primary"
            disabled={password.length < 8}
            pending={pending === 'password'}
            onClick={() =>
              run('password', async () => {
                const res = await adminSetPassword(data.user.id, password)
                if (res.ok) setPassword('')
                return res
              }, 'Contraseña actualizada')
            }
          >
            Cambiar
          </Button>
        </div>
      </Section>

      <Section
        title="Sesiones abiertas"
        description={`${data.sessions.length} ${data.sessions.length === 1 ? 'sesión' : 'sesiones'}`}
        actions={
          data.sessions.length && !isSelf ? (
            <Button size="sm" pending={pending === 'sessions'} onClick={() => run('sessions', () => adminRevokeSessions(data.user.id), 'Sesiones cerradas')}>
              <LogOut className="size-3.5" /> Cerrar todas
            </Button>
          ) : null
        }
      >
        {data.sessions.length ? (
          <ul className="-my-2 divide-y divide-border">
            {data.sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{s.userAgent ?? 'Dispositivo desconocido'}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress ?? 'IP desconocida'} · abierta {formatDate(s.createdAt, true)} · vence {formatDate(s.expiresAt)}
                  </p>
                </div>
                <IconButton label="Cerrar esta sesión" tone="danger" onClick={() => run(`s:${s.id}`, () => adminRevokeSessions(data.user.id, s.id), 'Sesión cerrada')}>
                  <ShieldOff className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tiene sesiones abiertas.</p>
        )}
      </Section>

      {!isSelf ? (
        <section className="rounded-2xl border border-olympic-red/40 p-5">
          <h3 className="font-display text-base font-semibold text-olympic-red">Zona peligrosa</h3>
          <p className="mt-1 text-sm text-muted-foreground">Borra la cuenta, el perfil, publicaciones, comentarios, reacciones, seguidores, matches y mensajes. No se puede deshacer.</p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() =>
              confirm({
                title: 'Eliminar usuario',
                body: `Vas a eliminar a ${profileDisplayName(data.profile, data.user.name)} (${data.user.email}) y todo su contenido.`,
                confirmLabel: 'Eliminar definitivamente',
                danger: true,
                typeToConfirm: 'ELIMINAR',
                onConfirm: async () => {
                  const res = await adminDeleteUsers([data.user.id])
                  if (!res.ok) return toast(res.error, 'error')
                  await refreshAdminData()
                  toast('Usuario eliminado')
                  onDeleted()
                },
              })
            }
          >
            <Trash2 className="size-4" /> Eliminar usuario
          </Button>
        </section>
      ) : null}
    </div>
  )
}

function ActivityTab({ data }: { data: Detail }) {
  const { confirm, toast } = useAdminFeedback()

  function remove(title: string, fn: () => Promise<{ ok: boolean }>) {
    confirm({
      title,
      body: 'Se elimina de forma permanente.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        await fn()
        await refreshAdminData()
        toast('Eliminado')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Publicaciones', value: data.posts.length, icon: Newspaper },
          { label: 'Comentarios', value: data.comments.length, icon: MessageCircle },
          { label: 'Matches', value: data.matches.length, icon: Handshake },
          { label: 'Reacciones dadas', value: data.reactions, icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <Icon className="size-4 text-muted-foreground" />
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <Section title="Publicaciones">
        {data.posts.length ? (
          <ul className="-my-2 divide-y divide-border">
            {data.posts.map((post) => (
              <li key={post.id} className="flex gap-3 py-3">
                {post.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={post.mediaUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{post.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {post.kind} · {formatDate(post.createdAt, true)}
                  </p>
                </div>
                <IconButton label="Eliminar publicación" tone="danger" onClick={() => remove('Eliminar publicación', () => adminDeletePost(post.id))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin publicaciones.</p>
        )}
      </Section>

      <Section title="Comentarios">
        {data.comments.length ? (
          <ul className="-my-2 divide-y divide-border">
            {data.comments.map((c) => (
              <li key={c.id} className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{c.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    en {c.targetId} · {formatDate(c.createdAt, true)}
                  </p>
                </div>
                <IconButton label="Eliminar comentario" tone="danger" onClick={() => remove('Eliminar comentario', () => adminDeleteComment(c.id))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin comentarios.</p>
        )}
      </Section>

      <Section title="Matches y conversaciones">
        {data.matches.length ? (
          <ul className="-my-2 divide-y divide-border">
            {data.matches.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Handshake className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.otherName}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.messages} mensajes · desde {formatDate(m.createdAt)}
                  </p>
                </div>
                <IconButton label="Eliminar match y su conversación" tone="danger" onClick={() => remove('Eliminar match y conversación', () => adminDeleteMatch(m.id))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin matches.</p>
        )}
      </Section>
    </div>
  )
}

function AdvancedTab({ data }: { data: Detail }) {
  const { toast } = useAdminFeedback()
  const [text, setText] = useState(() => JSON.stringify(data.profile ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save() {
    let parsed: AthleteProfile | OrgProfile
    try {
      parsed = JSON.parse(text)
    } catch {
      return setError('El JSON no es válido.')
    }
    setPending(true)
    setError(null)
    const res = await adminUpdateProfile(data.user.id, parsed)
    setPending(false)
    if (!res.ok) return setError(res.error)
    await refreshAdminData()
    toast('Perfil guardado')
  }

  return (
    <Section title="Datos crudos del perfil" description="Editá cualquier campo, incluso los que no aparecen en el formulario. El campo «kind» tiene que coincidir con la categoría.">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        aria-label="JSON del perfil"
        className="h-[55dvh] w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-foreground/60"
      />
      {error ? <p className="mt-2 text-sm text-olympic-red">{error}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={() => setText(JSON.stringify(data.profile ?? {}, null, 2))}>Descartar cambios</Button>
        <Button variant="primary" pending={pending} onClick={save}>
          Guardar JSON
        </Button>
      </div>
    </Section>
  )
}
