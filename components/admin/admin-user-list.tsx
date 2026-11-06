'use client'

import { useMemo, useState } from 'react'
import useSWR, { mutate as globalMutate, preload } from 'swr'
import { ArrowDownUp, BadgeCheck, Download, Eye, MailCheck, MailWarning, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { adminChangeRole, adminCreateUser, adminDeleteUsers, getAdminUser, listAdminUsers, type AdminUserRow } from '@/app/actions/admin'
import { ROLES, type Role } from '@/lib/profile-types'
import { AdminField, AdminSelect, Avatar, Button, IconButton, Modal, RoleBadge, Toggle, formatDate, roleMeta, useAdminFeedback } from '@/components/admin/admin-ui'
import type { AdminSection } from '@/components/admin/admin-panel'
import { ProfileProgress, ProfileReminderModal } from '@/components/admin/profile-reminder'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

type SortKey = 'createdAt' | 'displayName' | 'lastSeen' | 'completeness' | 'matches'

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'createdAt', label: 'Fecha de alta' },
  { value: 'displayName', label: 'Nombre' },
  { value: 'lastSeen', label: 'Última actividad' },
  { value: 'completeness', label: 'Perfil completo' },
  { value: 'matches', label: 'Matches' },
]

/** Fetches a user's detail ahead of the click; the drawer then opens with data ready. */
export function prefetchAdminUser(id: string) {
  preload(`admin:user:${id}`, () => load('getAdminUser', id))
}

export function refreshAdminData() {
  return globalMutate((key) => typeof key === 'string' && key.startsWith('admin:'))
}

export function AdminUserList({ section, onOpenUser }: { section: Exclude<AdminSection, 'resumen'>; onOpenUser: (id: string, tab?: 'perfil' | 'editar') => void }) {
  const { data, isLoading } = useSWR(`admin:users:${section}`, () => load('listAdminUsers', section))
  const { confirm, toast } = useAdminFeedback()
  const [query, setQuery] = useState('')
  const [verified, setVerified] = useState<'todos' | 'si' | 'no'>('todos')
  const [country, setCountry] = useState('todos')
  const [sort, setSort] = useState<SortKey>('createdAt')
  const [desc, setDesc] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [reminding, setReminding] = useState<AdminUserRow | null>(null)

  const label = section === 'sin-perfil' ? 'usuarios sin perfil' : roleMeta[section].plural.toLowerCase()
  const countries = useMemo(() => [...new Set((data ?? []).map((u) => u.country).filter(Boolean))].sort(), [data])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (data ?? []).filter((u) => {
      if (verified === 'si' && !u.emailVerified) return false
      if (verified === 'no' && u.emailVerified) return false
      if (country !== 'todos' && u.country !== country) return false
      if (!q) return true
      return [u.displayName, u.name, u.email, u.detail, u.country, u.city].some((v) => v.toLowerCase().includes(q))
    })
    return filtered.sort((a, b) => {
      const av = a[sort] ?? ''
      const bv = b[sort] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'es')
      return desc ? -cmp : cmp
    })
  }, [data, query, verified, country, sort, desc])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function askDelete(users: AdminUserRow[]) {
    const single = users.length === 1
    confirm({
      title: single ? `Eliminar a ${users[0].displayName}` : `Eliminar ${users.length} usuarios`,
      body: single
        ? 'Se borra la cuenta, el perfil, sus publicaciones, comentarios, matches y mensajes. No se puede deshacer.'
        : 'Se borran las cuentas, perfiles, publicaciones, comentarios, matches y mensajes de todos los usuarios seleccionados. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
      typeToConfirm: single ? undefined : 'ELIMINAR',
      onConfirm: async () => {
        const res = await adminDeleteUsers(users.map((u) => u.id))
        if (!res.ok) return toast(res.error, 'error')
        setSelected(new Set())
        await refreshAdminData()
        toast(single ? 'Usuario eliminado' : `${res.deleted} usuarios eliminados`)
      },
    })
  }

  function askMove(users: AdminUserRow[], to: Role) {
    confirm({
      title: `Mover a ${roleMeta[to].plural}`,
      body: `${users.length === 1 ? users[0].displayName : `${users.length} usuarios`} pasa${users.length === 1 ? '' : 'n'} a la categoría ${roleMeta[to].label}. Los datos con equivalente se conservan (nombre, país, disciplina o rubro, foto).`,
      confirmLabel: 'Mover',
      onConfirm: async () => {
        for (const u of users) {
          const res = await adminChangeRole(u.id, to)
          if (!res.ok) return toast(res.error, 'error')
        }
        setSelected(new Set())
        await refreshAdminData()
        toast(users.length === 1 ? `Movido a ${roleMeta[to].plural}` : `${users.length} usuarios movidos`)
      },
    })
  }

  function exportCsv() {
    const header = ['Nombre', 'Email', 'Categoría', 'Disciplina/Rubro', 'País', 'Ciudad', 'Email verificado', 'Alta', 'Última actividad', 'Publicaciones', 'Matches', 'Perfil %']
    const lines = rows.map((u) =>
      [u.displayName, u.email, u.role ? roleMeta[u.role].label : 'Sin perfil', u.detail, u.country, u.city, u.emailVerified ? 'Sí' : 'No', u.createdAt.slice(0, 10), u.lastSeen?.slice(0, 10) ?? '', u.posts, u.matches, u.completeness]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `boostsport-${section}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const selectedRows = rows.filter((r) => selected.has(r.id))
  const moveTargets = ROLES.filter((r) => r !== section)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${label} por nombre, email, ${section === 'deportista' ? 'disciplina' : 'rubro'} o país`}
            aria-label="Buscar"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-foreground/60"
          />
        </div>
        <AdminSelect
          label="Email"
          value={verified}
          onChange={(e) => setVerified(e.target.value as typeof verified)}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'si', label: 'Verificado' },
            { value: 'no', label: 'Sin verificar' },
          ]}
          className="w-36"
        />
        <AdminSelect label="País" value={country} onChange={(e) => setCountry(e.target.value)} options={[{ value: 'todos', label: 'Todos' }, ...countries.map((c) => ({ value: c, label: c }))]} className="w-40" />
        <div className="flex items-end gap-1">
          <AdminSelect label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} options={sortOptions} className="w-44" />
          <IconButton label={desc ? 'Orden descendente' : 'Orden ascendente'} onClick={() => setDesc((d) => !d)} className="size-10 border border-border">
            <ArrowDownUp className="size-4" />
          </IconButton>
        </div>
        <Button onClick={exportCsv} disabled={!rows.length}>
          <Download className="size-4" /> Exportar
        </Button>
        {section !== 'sin-perfil' ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nuevo {roleMeta[section].label.toLowerCase()}
          </Button>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
          <span className="text-sm font-semibold">{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span>
          <span className="flex-1" />
          {moveTargets.map((r) => (
            <Button key={r} size="sm" onClick={() => askMove(selectedRows, r)}>
              Mover a {roleMeta[r].plural}
            </Button>
          ))}
          <Button size="sm" variant="danger" onClick={() => askDelete(selectedRows)}>
            <Trash2 className="size-3.5" /> Eliminar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <Undo2 className="size-3.5" /> Limpiar
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                    className="size-4 accent-foreground"
                  />
                </th>
                <th className="px-2 py-3 font-semibold">{section === 'deportista' ? 'Deportista' : section === 'sin-perfil' ? 'Usuario' : 'Organización'}</th>
                <th className="px-2 py-3 font-semibold">{section === 'deportista' ? 'Disciplina' : 'Rubro'}</th>
                <th className="px-2 py-3 font-semibold">Ubicación</th>
                <th className="px-2 py-3 font-semibold">Perfil</th>
                <th className="px-2 py-3 font-semibold">Actividad</th>
                <th className="px-2 py-3 font-semibold">Alta</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-3">
                        <div className="h-9 animate-pulse rounded-lg bg-secondary" />
                      </td>
                    </tr>
                  ))
                : rows.map((u) => (
                    <tr key={u.id} onPointerEnter={() => prefetchAdminUser(u.id)} className={cn('transition-colors hover:bg-secondary/40', selected.has(u.id) && 'bg-secondary/60')}>
                      <td className="px-4 py-3">
                        <input type="checkbox" aria-label={`Seleccionar ${u.displayName}`} checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="size-4 accent-foreground" />
                      </td>
                      <td className="px-2 py-3">
                        <button type="button" onClick={() => onOpenUser(u.id, 'perfil')} className="flex items-center gap-3 text-left">
                          <Avatar name={u.displayName} image={u.image} role={u.role} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 font-semibold">
                              <span className="truncate">{u.displayName}</span>
                              {u.identityVerified ? <BadgeCheck className="size-3.5 shrink-0 text-olympic-blue" aria-label="Identidad verificada" /> : null}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {u.emailVerified ? <MailCheck className="size-3 text-olympic-green" aria-label="Email verificado" /> : <MailWarning className="size-3 text-olympic-yellow" aria-label="Email sin verificar" />}
                              <span className="truncate">{u.email}</span>
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-2 py-3">{u.detail || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-3 text-muted-foreground">{[u.city, u.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-2 py-3">
                        <ProfileProgress percent={u.completeness} missing={u.missing} onOpen={() => setReminding(u)} />
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        <p>{u.posts} publ. · {u.matches} matches</p>
                        <p>Visto: {formatDate(u.lastSeen)}</p>
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton label={`Ver perfil de ${u.displayName}`} onClick={() => onOpenUser(u.id, 'perfil')}>
                            <Eye className="size-4" />
                          </IconButton>
                          <IconButton label={`Editar a ${u.displayName}`} onClick={() => onOpenUser(u.id, 'editar')}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <select
                            aria-label={`Mover a ${u.displayName} de categoría`}
                            value=""
                            onChange={(e) => e.target.value && askMove([u], e.target.value as Role)}
                            className="h-8 w-20 cursor-pointer rounded-lg bg-transparent px-1 text-xs text-muted-foreground hover:bg-secondary"
                          >
                            <option value="">Mover…</option>
                            {moveTargets.map((r) => (
                              <option key={r} value={r}>
                                {roleMeta[r].plural}
                              </option>
                            ))}
                          </select>
                          <IconButton label={`Eliminar a ${u.displayName}`} tone="danger" onClick={() => askDelete([u])}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && !rows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {data?.length ? 'Ningún resultado con esos filtros.' : `Todavía no hay ${label}.`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Mostrando {rows.length} de {data?.length ?? 0} {label}
        </p>
      </div>

      {reminding ? (
        <ProfileReminderModal
          userId={reminding.id}
          name={reminding.displayName}
          email={reminding.email}
          percent={reminding.completeness}
          missing={reminding.missing}
          onClose={() => setReminding(null)}
        />
      ) : null}

      {creating && section !== 'sin-perfil' ? (
        <CreateUserModal
          role={section}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            onOpenUser(id, 'editar')
          }}
        />
      ) : null}
    </div>
  )
}

function CreateUserModal({ role: initialRole, onClose, onCreated }: { role: Role; onClose: () => void; onCreated: (id: string) => void }) {
  const { toast } = useAdminFeedback()
  const [role, setRole] = useState<Role>(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailVerified, setEmailVerified] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function generate() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(14))
    setPassword(Array.from(bytes, (b) => chars[b % chars.length]).join(''))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await adminCreateUser({ role, name, email, password, emailVerified })
    setPending(false)
    if (!res.ok) return setError(res.error)
    await refreshAdminData()
    toast(`${roleMeta[role].label} creado`)
    onCreated(res.id)
  }

  return (
    <Modal title={`Nuevo ${roleMeta[role].label.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AdminSelect label="Categoría" value={role} onChange={(e) => setRole(e.target.value as Role)} options={ROLES.map((r) => ({ value: r, label: roleMeta[r].label }))} />
        <AdminField label={role === 'deportista' ? 'Nombre y apellido' : 'Nombre de la organización'} value={name} onChange={(e) => setName(e.target.value)} required />
        <AdminField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="flex items-end gap-2">
          <AdminField label="Contraseña" type="text" value={password} onChange={(e) => setPassword(e.target.value)} hint="Mínimo 8 caracteres. Pasásela al usuario por un canal seguro." className="flex-1" required />
          <Button onClick={generate} className="mb-6">
            Generar
          </Button>
        </div>
        <Toggle label="Email verificado" checked={emailVerified} onChange={setEmailVerified} />
        {error ? <p className="text-sm text-olympic-red">{error}</p> : null}
        <p className="text-xs text-muted-foreground">Después de crearlo se abre el editor para completar el perfil.</p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" pending={pending}>
            Crear
          </Button>
        </div>
      </form>
    </Modal>
  )
}
