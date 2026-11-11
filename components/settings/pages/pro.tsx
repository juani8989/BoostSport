'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  BadgeDollarSign,
  BarChart3,
  Bookmark,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileText,
  HandHeart,
  Handshake,
  Heart,
  Landmark,
  Link2,
  MessageCircle,
  Receipt,
  Send,
  Share2,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { getMyDeals, getMyStats } from '@/app/actions/settings'
import type { Currency } from '@/lib/settings'
import { useNav } from '@/components/app/nav'
import { PartyAvatar, compactNumber } from '@/components/app/kit'
import { useSettings } from '@/components/settings/use-settings'
import { Choice, Empty, Field, Intro, Loading, Notice, Page, PrimaryButton, Row, Section, Tabs, dateLabel, inputClass } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'
import { cn } from '@/lib/utils'
import { load } from '@/lib/load'

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Heart; label: string; value: number | string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-secondary p-3">
      <Icon className="size-4 text-muted-foreground" />
      <span className="font-display text-2xl font-semibold tabular-nums">{typeof value === 'number' ? compactNumber(value) : value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {sub ? <span className="text-[11px] font-semibold text-olympic-green">{sub}</span> : null}
    </div>
  )
}

export function StatsPage({ back }: PageProps) {
  const { data, isLoading } = useSWR('my-stats', () => load('getMyStats'))
  const [tab, setTab] = useState<'resumen' | 'contenido' | 'negocios'>('resumen')
  const max = data ? Math.max(1, ...data.weekly.map((w) => Math.max(w.followers, w.likes))) : 1

  return (
    <Page title="Estadísticas" onBack={back}>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'resumen', label: 'Resumen' },
          { value: 'contenido', label: 'Contenido' },
          { value: 'negocios', label: 'Acuerdos' },
        ]}
      />
      {isLoading || !data ? <Loading /> : null}

      {data && tab === 'resumen' ? (
        <>
          <div className="grid grid-cols-2 gap-2 p-4">
            <Stat icon={Users} label="Seguidores" value={data.followers} sub={data.newFollowers7 ? `+${data.newFollowers7} esta semana` : undefined} />
            <Stat icon={UserPlus} label="Seguidos" value={data.following} />
            <Stat icon={Heart} label="Me gusta recibidos" value={data.likes} />
            <Stat icon={HandHeart} label="Apoyos recibidos" value={data.apoyos} />
            <Stat icon={MessageCircle} label="Comentarios recibidos" value={data.comments} />
            <Stat icon={Bookmark} label="Veces guardado" value={data.saves} />
          </div>
          <Section title="Últimas 6 semanas">
            <div className="flex h-40 items-end gap-2 px-4 pb-2 pt-4" role="img" aria-label="Nuevos seguidores y me gusta por semana">
              {data.weekly.map((w) => (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-28 w-full items-end justify-center gap-0.5">
                    <span className="w-2.5 rounded-t bg-olympic-blue" style={{ height: `${(w.followers / max) * 100}%`, minHeight: w.followers ? 4 : 1 }} title={`${w.followers} seguidores`} />
                    <span className="w-2.5 rounded-t bg-olympic-red" style={{ height: `${(w.likes / max) * 100}%`, minHeight: w.likes ? 4 : 1 }} title={`${w.likes} me gusta`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{w.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 px-4 pb-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-olympic-blue" /> Nuevos seguidores
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-olympic-red" /> Me gusta
              </span>
            </div>
          </Section>
          <Section title="Perfil">
            <div className="px-4 py-2">
              <div className="flex justify-between text-sm">
                <span>Perfil completo</span>
                <span className="font-semibold">{data.completeness} %</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-olympic-green" style={{ width: `${data.completeness}%` }} />
              </div>
            </div>
            <Row icon={TrendingUp} label="Nuevos seguidores en 30 días" value={String(data.newFollowers30)} />
          </Section>
        </>
      ) : null}

      {data && tab === 'contenido' ? (
        <>
          <div className="grid grid-cols-2 gap-2 p-4">
            <Stat icon={FileText} label="Publicaciones" value={data.posts} />
            <Stat icon={TrendingUp} label="Interacción por post" value={data.posts ? ((data.likes + data.comments) / data.posts).toFixed(1) : '0'} />
          </div>
          <Section title="Tus publicaciones con más interacción">
            {!data.topPosts.length ? <Empty icon={FileText} title="Todavía no publicaste">Publicá en Compañeros para ver cómo le va a tu contenido.</Empty> : null}
            <ol>
              {data.topPosts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-4 font-display text-lg font-semibold text-muted-foreground">{i + 1}</span>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="size-12 rounded-lg object-cover" />
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 text-sm">{p.body}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.likes} me gusta · {p.comments} comentarios
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </>
      ) : null}

      {data && tab === 'negocios' ? (
        <>
          <div className="grid grid-cols-2 gap-2 p-4">
            <Stat icon={Handshake} label="Matches" value={data.matches} />
            <Stat icon={Target} label="Te mostraron interés" value={data.interestReceived} />
            <Stat icon={Send} label="Propuestas enviadas" value={data.offers.sent} />
            <Stat icon={BadgeDollarSign} label="Propuestas recibidas" value={data.offers.received} />
            <Stat icon={CheckCircle2} label="Aceptadas" value={data.offers.accepted} />
            <Stat icon={XCircle} label="Rechazadas" value={data.offers.rejected} />
          </div>
          <Section>
            <Row icon={Clock} label="Propuestas pendientes" value={String(data.offers.pending)} />
            <Row icon={MessageCircle} label="Mensajes enviados / recibidos" value={`${data.messagesSent} / ${data.messagesReceived}`} />
            <Row icon={Target} label="Interés que mostraste en Match" value={String(data.interestShown)} />
            <Row
              icon={TrendingUp}
              label="Tasa de aceptación"
              value={data.offers.accepted + data.offers.rejected ? `${Math.round((data.offers.accepted / (data.offers.accepted + data.offers.rejected)) * 100)} %` : '—'}
            />
          </Section>
        </>
      ) : null}
    </Page>
  )
}

export function ToolsPage({ back, go }: PageProps) {
  const { account } = useSettings()
  const [copied, setCopied] = useState<string | null>(null)
  const link = typeof window !== 'undefined' && account ? `${window.location.origin}/?perfil=${encodeURIComponent(account.key)}` : ''

  async function copy(text: string, what: string) {
    await navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(what)
    setTimeout(() => setCopied(null), 2000)
  }

  async function share() {
    if (!account) return
    const text = `Conocé a ${account.name} en BoostSport`
    if (navigator.share) await navigator.share({ title: 'BoostSport', text, url: link }).catch(() => {})
    else copy(link, 'link')
  }

  const bio = account
    ? `${account.name} · ${account.party.subtitle}. Buscando sponsors en BoostSport 🏅 ${link}`
    : ''

  return (
    <Page title="Herramientas" onBack={back}>
      <Section title="Difundí tu perfil">
        <Row icon={Share2} label="Compartir perfil" hint="Mandalo por WhatsApp, mail o redes." onClick={share} />
        <Row icon={Link2} label="Copiar link del perfil" value={copied === 'link' ? '¡Copiado!' : undefined} onClick={() => copy(link, 'link')} />
        <Row icon={Copy} label="Copiar bio para Instagram" hint={bio.slice(0, 90)} value={copied === 'bio' ? '¡Copiado!' : undefined} onClick={() => copy(bio, 'bio')} />
      </Section>
      <Section title="Crecé en BoostSport">
        <Row icon={BarChart3} label="Estadísticas" hint="Seguidores, interacción y acuerdos" onClick={() => go('estadisticas')} />
        <Row icon={CheckCircle2} label="Verificación y perfil completo" value={account ? `${account.completeness} %` : undefined} onClick={() => go('verificacion')} />
        <Row icon={Wallet} label="Pagos y acuerdos" onClick={() => go('pagos')} />
      </Section>
      <Section title="Consejos">
        <Row icon={TrendingUp} label="Publicá al menos 3 veces por semana" hint="Los perfiles activos reciben más propuestas." />
        <Row icon={Target} label="Contá tus metas con fecha" hint="Las marcas buscan objetivos concretos para asociarse." />
      </Section>
    </Page>
  )
}

const statusStyle: Record<string, string> = {
  aceptada: 'bg-olympic-green/15 text-olympic-green',
  rechazada: 'bg-destructive/15 text-destructive',
  pendiente: 'bg-olympic-yellow/20 text-olympic-yellow',
}

export function PaymentsPage({ back, go, close }: PageProps) {
  const nav = useNav()
  const { settings, update } = useSettings()
  const { data, isLoading } = useSWR('deals', () => load('getMyDeals'))
  const [filter, setFilter] = useState<'todas' | 'aceptada' | 'pendiente' | 'rechazada'>('todas')
  const deals = (data ?? []).filter((d) => filter === 'todas' || d.status === filter)
  const accepted = (data ?? []).filter((d) => d.status === 'aceptada')

  return (
    <Page title="Pagos y acuerdos" onBack={back}>
      <div className="grid grid-cols-3 gap-2 p-4 text-center">
        <div className="rounded-2xl bg-secondary p-3">
          <p className="font-display text-2xl font-semibold">{accepted.length}</p>
          <p className="text-[11px] text-muted-foreground">Activos</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <p className="font-display text-2xl font-semibold">{(data ?? []).filter((d) => d.status === 'pendiente').length}</p>
          <p className="text-[11px] text-muted-foreground">Pendientes</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <p className="font-display text-2xl font-semibold">{settings.payments.currency}</p>
          <p className="text-[11px] text-muted-foreground">Moneda</p>
        </div>
      </div>

      <Section title="Cobros y pagos">
        <Row icon={CreditCard} label="Métodos de cobro y pago" hint="Mercado Pago, transferencia y tarjeta" value="Próximamente" />
        <Row icon={Receipt} label="Datos de facturación" hint={settings.payments.billingName || 'Para emitir y recibir facturas'} onClick={() => go('facturacion')} />
        <Row icon={Landmark} label="Moneda preferida" value={settings.payments.currency} />
        <div className="flex gap-2 px-4 pb-2">
          {(['ARS', 'USD', 'EUR', 'BRL'] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={settings.payments.currency === c}
              onClick={() => update({ payments: { currency: c } })}
              className={cn('flex-1 rounded-xl py-2 text-sm font-semibold', settings.payments.currency === c ? 'bg-foreground text-background' : 'bg-secondary')}
            >
              {c}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Historial de propuestas">
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
          {(['todas', 'aceptada', 'pendiente', 'rechazada'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize', filter === f ? 'bg-foreground text-background' : 'bg-secondary')}>
              {f === 'todas' ? 'Todas' : f === 'aceptada' ? 'Aceptadas' : f === 'pendiente' ? 'Pendientes' : 'Rechazadas'}
            </button>
          ))}
        </div>
        {isLoading ? <Loading /> : null}
        {data && !deals.length ? <Empty icon={Handshake} title="Sin propuestas">Cuando hagas match y negocies un sponsoreo, lo vas a ver acá.</Empty> : null}
        <ul>
          {deals.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => (close(), nav.openChat(d.matchId))} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/60">
                <PartyAvatar party={d.other} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{d.other.name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', statusStyle[d.status])}>{d.status}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {d.mine ? 'Enviaste' : 'Recibiste'} · {d.type}
                    {d.amount ? ` · ${d.amount}` : ''}
                    {d.duration ? ` · ${d.duration}` : ''}
                  </span>
                  {d.items.length ? <span className="truncate text-xs text-muted-foreground">{d.items.join(', ')}</span> : null}
                  <span className="text-[11px] text-muted-foreground">{dateLabel(d.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  )
}

const TAX_CONDITIONS = [
  { value: 'Monotributo', label: 'Monotributo' },
  { value: 'Responsable inscripto', label: 'Responsable inscripto' },
  { value: 'Exento', label: 'Exento' },
  { value: 'Consumidor final', label: 'Consumidor final' },
]

export function BillingPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const [form, setForm] = useState(settings.payments)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setForm({ ...form, [k]: e.target.value })
  }

  async function save() {
    setPending(true)
    await update({ payments: { billingName: form.billingName, taxId: form.taxId.replace(/[^\d-]/g, ''), taxCondition: form.taxCondition, billingAddress: form.billingAddress, billingEmail: form.billingEmail } })
    setPending(false)
    setSaved(true)
  }

  return (
    <Page title="Datos de facturación" onBack={back}>
      <Intro icon={Receipt} title="Para tus acuerdos">
        Los usamos para armar los comprobantes de tus sponsoreos. Solo los ves vos y la contraparte de un acuerdo aceptado.
      </Intro>
      <Field label="Nombre o razón social">
        <input value={form.billingName} onChange={set('billingName')} maxLength={120} className={inputClass} />
      </Field>
      <Field label="CUIT / CUIL">
        <input value={form.taxId} onChange={set('taxId')} inputMode="numeric" maxLength={13} placeholder="20-12345678-9" className={inputClass} />
      </Field>
      <Section title="Condición frente al IVA">
        <Choice name="Condición frente al IVA" value={form.taxCondition} options={TAX_CONDITIONS} onChange={(v) => (setSaved(false), setForm({ ...form, taxCondition: v }))} />
      </Section>
      <Field label="Domicilio fiscal">
        <input value={form.billingAddress} onChange={set('billingAddress')} maxLength={200} className={inputClass} />
      </Field>
      <Field label="Email para comprobantes">
        <input type="email" value={form.billingEmail} onChange={set('billingEmail')} maxLength={120} className={inputClass} />
      </Field>
      <label className="flex items-center gap-3 px-4 py-3 text-sm">
        <input
          type="checkbox"
          checked={settings.payments.receipts}
          onChange={(e) => update({ payments: { receipts: e.target.checked } })}
          className="size-4 accent-olympic-blue"
        />
        Recibir un resumen por email de cada acuerdo aceptado
      </label>
      {saved ? <Notice tone="ok">Guardamos tus datos de facturación.</Notice> : null}
      <div className="px-4 pt-2">
        <PrimaryButton pending={pending} onClick={save} className="w-full">
          Guardar
        </PrimaryButton>
      </div>
    </Page>
  )
}
