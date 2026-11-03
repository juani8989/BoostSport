'use client'

import { useEffect, useState } from 'react'
import useSWR, { preload } from 'swr'
import { ArrowRight, Building2, Eye, Handshake, LayoutDashboard, LogOut, Menu, MessageCircle, MessagesSquare, Newspaper, ShieldAlert, Trophy, UserRound, UserRoundX, Users, X } from 'lucide-react'
import { getAdminOverview, listAdminUsers } from '@/app/actions/admin'
import { signOut } from '@/lib/auth-store'
import type { Role } from '@/lib/profile-types'
import { BrandLine, BrandLogo } from '@/components/brand-logo'
import { AdminFeedbackProvider, Avatar, RoleBadge, Section, formatDate, roleMeta } from '@/components/admin/admin-ui'
import { AdminUserList, prefetchAdminUser } from '@/components/admin/admin-user-list'
import { AdminUserDetail } from '@/components/admin/admin-user-detail'
import { cn } from '@/lib/utils'

export type AdminSection = 'resumen' | Role | 'sin-perfil'

const roleIcon: Record<Role, typeof Trophy> = { deportista: Trophy, empresa: Building2, evento: Users }

const navItems: { id: AdminSection; label: string; icon: typeof Trophy }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'deportista', label: 'Deportistas', icon: Trophy },
  { id: 'empresa', label: 'Sponsors', icon: Building2 },
  { id: 'evento', label: 'Instituciones', icon: Users },
  { id: 'sin-perfil', label: 'Sin perfil', icon: UserRoundX },
]

export function AdminPanel({ admin }: { admin: { id: string; name: string; email: string } }) {
  const [section, setSection] = useState<AdminSection>('resumen')
  const [openUser, setOpenUser] = useState<{ id: string; tab?: 'perfil' | 'editar' } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: overview } = useSWR('admin:overview', () => getAdminOverview())

  useEffect(() => {
    // Load every category list in the background so opening one is instant.
    const id = setTimeout(() => {
      for (const s of ['deportista', 'empresa', 'evento', 'sin-perfil'] as const) preload(`admin:users:${s}`, () => listAdminUsers(s))
    }, 400)
    return () => clearTimeout(id)
  }, [])

  const go = (next: AdminSection) => {
    setSection(next)
    setMenuOpen(false)
  }

  const countFor = (id: AdminSection) =>
    !overview ? undefined : id === 'resumen' ? undefined : id === 'sin-perfil' ? overview.withoutProfile : overview.counts[id]

  return (
    <AdminFeedbackProvider>
      <div className="min-h-dvh bg-background text-foreground">
        <BrandLine className="fixed inset-x-0 top-0 z-40" />

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card pt-1 transition-transform lg:translate-x-0',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <BrandLogo className="h-7 rounded-md" />
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="lg:hidden">
              <X className="size-5" />
            </button>
          </div>
          <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Administración</p>
          <nav aria-label="Secciones del panel" className="flex flex-col gap-1 px-3">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = section === id
              const n = countFor(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4', id !== 'resumen' && id !== 'sin-perfil' && roleMeta[id].text)} />
                  <span className="flex-1 text-left">{label}</span>
                  {n !== undefined ? <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{n}</span> : null}
                </button>
              )
            })}
          </nav>
          <div className="mt-auto border-t border-border p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-olympic-red text-xs font-bold text-white">
                <ShieldAlert className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{admin.name}</p>
                <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
              </div>
              <button type="button" onClick={signOut} aria-label="Cerrar sesión" className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>
        {menuOpen ? <button type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 bg-black/60 lg:hidden" /> : null}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur sm:px-8">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" className="flex size-9 items-center justify-center rounded-lg border border-border lg:hidden">
              <Menu className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Panel de administración</p>
              <h1 className="truncate font-display text-2xl font-semibold">{navItems.find((n) => n.id === section)?.label}</h1>
            </div>
            <span className="hidden rounded-full bg-olympic-red/15 px-3 py-1 text-xs font-bold text-olympic-red sm:inline">Acceso total</span>
          </header>

          <main className="px-4 py-6 sm:px-8">
            {section === 'resumen' ? (
              <Overview onOpenSection={go} onOpenUser={(id) => setOpenUser({ id, tab: 'perfil' })} />
            ) : (
              <AdminUserList key={section} section={section} onOpenUser={(id, tab) => setOpenUser({ id, tab })} />
            )}
          </main>
        </div>

        {openUser ? <AdminUserDetail userId={openUser.id} initialTab={openUser.tab} selfId={admin.id} onClose={() => setOpenUser(null)} /> : null}
      </div>
    </AdminFeedbackProvider>
  )
}

function Overview({ onOpenSection, onOpenUser }: { onOpenSection: (s: AdminSection) => void; onOpenUser: (id: string) => void }) {
  const { data, isLoading } = useSWR('admin:overview', () => getAdminOverview())

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    )
  }

  const kpis = [
    { label: 'Usuarios totales', value: data.totalUsers, icon: UserRound },
    { label: 'Nuevos esta semana', value: data.newThisWeek, icon: ArrowRight },
    { label: 'Activos esta semana', value: data.activeThisWeek, icon: Eye },
    { label: 'Publicaciones', value: data.posts, icon: Newspaper },
    { label: 'Comentarios', value: data.comments, icon: MessagesSquare },
    { label: 'Matches', value: data.matches, icon: Handshake },
    { label: 'Mensajes', value: data.messages, icon: MessageCircle },
    { label: 'Denuncias', value: data.reports, icon: ShieldAlert },
  ]
  const peak = Math.max(1, ...data.signups.map((s) => s.count))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {(['deportista', 'empresa', 'evento'] as const).map((role) => {
          const Icon = roleIcon[role]
          const meta = roleMeta[role]
          return (
            <button
              key={role}
              type="button"
              onClick={() => onOpenSection(role)}
              className="group relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:border-foreground/30"
            >
              <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1', meta.dot)} />
              <div className="flex items-center justify-between">
                <span className={cn('flex size-11 items-center justify-center rounded-xl', meta.soft)}>
                  <Icon className="size-5" />
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                  Ver todos <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <div>
                <p className="font-display text-5xl font-semibold tabular-nums">{data.counts[role]}</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{meta.plural}</p>
              </div>
            </button>
          )
        })}
      </div>

      {data.withoutProfile > 0 ? (
        <button
          type="button"
          onClick={() => onOpenSection('sin-perfil')}
          className="flex items-center gap-3 rounded-xl border border-olympic-yellow/40 bg-olympic-yellow/10 px-4 py-3 text-left text-sm"
        >
          <UserRoundX className="size-4 shrink-0 text-olympic-yellow" />
          <span className="flex-1">
            <strong>{data.withoutProfile}</strong> {data.withoutProfile === 1 ? 'usuario se registró' : 'usuarios se registraron'} pero no completó el perfil.
          </span>
          <ArrowRight className="size-4" />
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <Icon className="size-4 text-muted-foreground" />
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Section title="Registros" description="Usuarios nuevos en los últimos 14 días" className="xl:col-span-2">
          <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Gráfico de registros por día">
            {data.signups.map((s) => (
              <div key={s.day} className="group relative flex flex-1 flex-col items-center justify-end">
                <span className="pointer-events-none absolute -top-6 hidden rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background group-hover:block">{s.count}</span>
                <span className={cn('w-full rounded-t', s.count ? 'bg-olympic-blue' : 'bg-secondary')} style={{ height: `${Math.max(4, (s.count / peak) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{formatDate(data.signups[0]?.day ?? null)}</span>
            <span>Hoy</span>
          </div>
        </Section>

        <Section title="Últimos registros" description="Tocá el ojo para ver el perfil completo" className="xl:col-span-3">
          <ul className="-my-2 divide-y divide-border">
            {data.recent.map((u) => (
              <li key={u.id} onPointerEnter={() => prefetchAdminUser(u.id)} className="flex items-center gap-3 py-2.5">
                <Avatar name={u.displayName} image={u.image} role={u.role} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <RoleBadge role={u.role} />
                <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{formatDate(u.createdAt)}</span>
                <button type="button" onClick={() => onOpenUser(u.id)} aria-label={`Ver perfil de ${u.displayName}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary">
                  <Eye className="size-4" />
                </button>
              </li>
            ))}
            {!data.recent.length ? <li className="py-6 text-center text-sm text-muted-foreground">Todavía no hay usuarios.</li> : null}
          </ul>
        </Section>
      </div>
    </div>
  )
}
