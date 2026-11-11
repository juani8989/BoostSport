'use client'

import { useState } from 'react'
import { BadgeCheck, Bug, GraduationCap, ChevronDown, FileText, HelpCircle, Info, LifeBuoy, Mail, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useSettings } from '@/components/settings/use-settings'
import { Intro, Loading, Page, Row, Section, dateLabel } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'
import { OPEN_TUTORIAL_EVENT } from '@/components/onboarding/tutorial'

const SUPPORT_EMAIL = 'BoostSportOly@gmail.com'

const FAQ = [
  { q: '¿Cómo funciona Match?', a: 'Deslizá a la derecha para mostrar interés en una marca, institución o deportista. Si el interés es mutuo, se abre un chat para negociar.' },
  { q: '¿Cómo consigo un sponsor?', a: 'Completá tu perfil al 100 %, publicá tu entrenamiento en Compañeros y usá Match. Las marcas priorizan perfiles verificados y activos.' },
  { q: '¿Qué es una propuesta de sponsoreo?', a: 'Es una oferta formal dentro del chat: producto, dinero, embajada o sponsoreo de un evento, con duración y condiciones. Podés aceptarla o rechazarla.' },
  { q: '¿Quién ve lo que publico?', a: 'Tus publicaciones de Compañeros las ve toda la comunidad. Si no querés que alguien las vea, bloquealo o silencialo desde Configuración.' },
  { q: '¿Cómo reporto a alguien?', a: 'En cada publicación tocá los tres puntos → Reportar. Para personas, podés bloquearlas o restringirlas desde Configuración.' },
  { q: '¿BoostSport cobra comisión?', a: 'Hoy no. Los acuerdos se cierran directamente entre las partes.' },
]

export function HelpPage({ back }: PageProps) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Page title="Ayuda" onBack={back}>
      <Intro icon={LifeBuoy} title="¿En qué te ayudamos?">
        Respuestas rápidas a lo que más nos preguntan. Si no encontrás lo tuyo, escribinos.
      </Intro>
      <Section title="Preguntas frecuentes">
        {FAQ.map((f, i) => (
          <div key={f.q} className="border-b border-border last:border-b-0">
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <HelpCircle className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-[15px]">{f.q}</span>
              <ChevronDown className={`size-4 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i ? <p className="px-4 pb-4 pl-12 text-sm leading-relaxed text-muted-foreground">{f.a}</p> : null}
          </div>
        ))}
      </Section>
      <Section title="Aprender a usar la app">
        <Row icon={GraduationCap} label="Ver el tutorial de nuevo" hint="Los gestos, Match, compartir y qué podés personalizar" onClick={() => window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT))} />
      </Section>
      <Section title="Contacto">
        <Row icon={Mail} label="Escribir a soporte" hint={SUPPORT_EMAIL} onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ayuda con BoostSport')}`)} />
        <Row
          icon={Bug}
          label="Reportar un problema"
          hint="Contanos qué pasó y en qué pantalla"
          onClick={() =>
            window.open(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Problema en BoostSport')}&body=${encodeURIComponent(`Qué pasó:\n\nQué esperaba:\n\nNavegador: ${navigator.userAgent}`)}`,
            )
          }
        />
      </Section>
    </Page>
  )
}

export function AccountStatusPage({ back }: PageProps) {
  const { account } = useSettings()
  if (!account) return <Page title="Estado de la cuenta" onBack={back}><Loading /></Page>
  const issues = [!account.emailVerified && 'Confirmá tu email para no perder el acceso.', account.completeness < 60 && 'Tu perfil está incompleto: aparece menos en Match.'].filter(Boolean) as string[]
  return (
    <Page title="Estado de la cuenta" onBack={back}>
      <Intro icon={issues.length ? ShieldQuestion : ShieldCheck} title={issues.length ? 'Hay cosas para revisar' : 'Tu cuenta está en regla'}>
        {issues.length ? 'Resolvelas para que tu cuenta tenga todo el alcance.' : 'No tenés reportes, restricciones ni avisos pendientes.'}
      </Intro>
      <Section>
        <Row icon={BadgeCheck} label="Email" value={account.emailVerified ? 'Confirmado' : 'Sin confirmar'} />
        <Row icon={ShieldCheck} label="Restricciones" value="Ninguna" />
        <Row icon={FileText} label="Perfil completo" value={`${account.completeness} %`} />
        <Row icon={Info} label="Miembro desde" value={dateLabel(account.createdAt)} />
      </Section>
      {issues.length ? (
        <Section title="Para revisar">
          {issues.map((i) => (
            <Row key={i} icon={ShieldQuestion} label={i} />
          ))}
        </Section>
      ) : null}
    </Page>
  )
}

export function InfoPage({ back }: PageProps) {
  const [open, setOpen] = useState<string | null>(null)
  const docs = [
    {
      id: 'terminos',
      title: 'Términos de uso',
      body: 'BoostSport conecta deportistas, sponsors e instituciones. Cada usuario es responsable de la veracidad de su perfil y de los acuerdos que cierra. No se permiten perfiles falsos, acoso ni contenido ilegal. Podemos suspender cuentas que incumplan estas reglas.',
    },
    {
      id: 'privacidad',
      title: 'Política de privacidad',
      body: 'Guardamos los datos de tu cuenta, tu perfil, lo que publicás y tus conversaciones para que la plataforma funcione. No vendemos tus datos. Podés descargar una copia o eliminar tu cuenta cuando quieras desde Configuración.',
    },
    {
      id: 'comunidad',
      title: 'Normas de la comunidad',
      body: 'Respeto entre deportistas, marcas e instituciones. Celebramos el esfuerzo: nada de burlas, discriminación ni spam. Reportá lo que no esté bien y lo revisamos.',
    },
  ]
  return (
    <Page title="Información" onBack={back}>
      <Section>
        {docs.map((d) => (
          <div key={d.id}>
            <Row icon={FileText} label={d.title} onClick={() => setOpen(open === d.id ? null : d.id)} />
            {open === d.id ? <p className="px-4 pb-4 pl-14 text-sm leading-relaxed text-muted-foreground">{d.body}</p> : null}
          </div>
        ))}
      </Section>
      <Section>
        <Row icon={Info} label="Versión" value="BoostSport 1.0" />
        <Row icon={Info} label="Hecho en" value="Argentina 🇦🇷" />
      </Section>
    </Page>
  )
}
