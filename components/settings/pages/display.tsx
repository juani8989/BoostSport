'use client'

import { mutate as globalMutate } from 'swr'
import { Accessibility, Contrast, Eye, EyeOff, Gauge, Heart, Languages, Moon, PlayCircle, ShieldAlert, Sparkles, Wind } from 'lucide-react'
import { useSettings } from '@/components/settings/use-settings'
import { Choice, Intro, Page, Row, Section, Toggle } from '@/components/settings/ui'
import type { PageProps } from '@/components/settings/types'
import { cn } from '@/lib/utils'

export function WhatYouSeePage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const f = settings.feed
  return (
    <Page title="Qué ves" onBack={back}>
      <Section title="Recuentos de me gusta" hint="Ocultá el número de me gusta y apoyos en las publicaciones de otros. Vos seguís viendo los de las tuyas en Estadísticas.">
        <Toggle icon={Heart} label="Ocultar recuentos" checked={f.hideLikeCounts} onChange={(v) => update({ feed: { hideLikeCounts: v } }).then(() => globalMutate('companeros'))} />
      </Section>
      <Section title="Contenido sensible">
        <Choice
          name="Contenido sensible"
          value={f.sensitiveContent}
          onChange={(v) => update({ feed: { sensitiveContent: v } })}
          options={[
            { value: 'menos', label: 'Menos', hint: 'Filtramos más publicaciones con lesiones, peleas o contenido fuerte.' },
            { value: 'estandar', label: 'Estándar', hint: 'Lo recomendado para la mayoría.' },
            { value: 'mas', label: 'Más', hint: 'Ves más contenido de deportes de contacto y lesiones.' },
          ]}
        />
      </Section>
    </Page>
  )
}

const DISCIPLINES = [
  'Atletismo', 'Natación', 'Fútbol', 'Básquet', 'Vóley', 'Tenis', 'Hockey', 'Rugby', 'Ciclismo', 'Boxeo', 'Judo', 'Karate', 'Taekwondo',
  'Gimnasia', 'Escalada', 'Surf', 'Skate', 'Remo', 'Waterpolo', 'Handball', 'Pádel', 'Esgrima', 'Triatlón', 'Running', 'Patín', 'Esports',
]

export function InterestsPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const chosen = new Set(settings.feed.interests)
  function toggle(d: string) {
    const next = new Set(chosen)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    update({ feed: { interests: [...next] } })
  }
  return (
    <Page title="Disciplinas que te interesan" onBack={back}>
      <Intro icon={Sparkles} title="Armá tu feed">
        Elegí las disciplinas que más te interesan. Las usamos para ordenar el feed, Match y las convocatorias que te sugerimos.
      </Intro>
      <ul className="flex flex-wrap gap-2 px-4 pb-6">
        {DISCIPLINES.map((d) => (
          <li key={d}>
            <button
              type="button"
              aria-pressed={chosen.has(d)}
              onClick={() => toggle(d)}
              className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition-colors', chosen.has(d) ? 'border-olympic-blue bg-olympic-blue text-olympic-white' : 'border-border bg-card')}
            >
              {d}
            </button>
          </li>
        ))}
      </ul>
    </Page>
  )
}

export function ThemePage({ back }: PageProps) {
  const { settings, update } = useSettings()
  return (
    <Page title="Tema" onBack={back}>
      <div className="grid grid-cols-3 gap-3 px-4 py-6">
        {([
          ['oscuro', 'Oscuro', 'bg-[#0a0a0a] text-[#ededed]'],
          ['claro', 'Claro', 'bg-[#fafafa] text-[#0a0a0a]'],
          ['sistema', 'Del sistema', 'bg-gradient-to-br from-[#fafafa] from-50% to-[#0a0a0a] to-50% text-[#0a0a0a]'],
        ] as const).map(([value, label, preview]) => (
          <button
            key={value}
            type="button"
            aria-pressed={settings.app.theme === value}
            onClick={() => update({ app: { theme: value } })}
            className={cn('flex flex-col items-center gap-2 rounded-2xl border-2 p-2', settings.app.theme === value ? 'border-olympic-blue' : 'border-border')}
          >
            <span className={cn('flex h-24 w-full items-end justify-center rounded-xl border border-border p-2 text-[10px] font-bold', preview)}>
              <Moon className="size-4" />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </Page>
  )
}

export function AccessibilityPage({ back }: PageProps) {
  const { settings, update } = useSettings()
  const a = settings.app
  return (
    <Page title="Accesibilidad" onBack={back}>
      <Section title="Tamaño del texto">
        <Choice
          name="Tamaño del texto"
          value={a.textSize}
          onChange={(v) => update({ app: { textSize: v } })}
          options={[
            { value: 'chico', label: 'Chico' },
            { value: 'normal', label: 'Normal' },
            { value: 'grande', label: 'Grande' },
          ]}
        />
      </Section>
      <Section>
        <Toggle icon={Wind} label="Reducir movimiento" hint="Menos animaciones y transiciones." checked={a.reduceMotion} onChange={(v) => update({ app: { reduceMotion: v } })} />
        <Toggle icon={Contrast} label="Alto contraste" hint="Bordes y textos secundarios más marcados." checked={a.highContrast} onChange={(v) => update({ app: { highContrast: v } })} />
        <Row icon={Accessibility} label="Textos alternativos" hint="Las fotos de deportistas y eventos incluyen descripciones para lectores de pantalla." />
      </Section>
      <Section title="Vista previa">
        <p className="px-4 py-2 text-[length:var(--settings-preview)] leading-relaxed" style={{ ['--settings-preview' as string]: a.textSize === 'chico' ? '13px' : a.textSize === 'grande' ? '18px' : '15px' }}>
          Valentina bajó 2 segundos su marca en 400 m. ¡Apoyala para que llegue al Nacional!
        </p>
      </Section>
    </Page>
  )
}

export function LanguagePage({ back }: PageProps) {
  const { settings, update } = useSettings()
  return (
    <Page title="Idioma" onBack={back}>
      <Intro icon={Languages} title="Idioma de la app">
        Por ahora BoostSport está en español. Guardamos tu preferencia para cuando sumemos inglés y portugués.
      </Intro>
      <Section>
        <Choice
          name="Idioma"
          value={settings.app.language}
          onChange={(v) => update({ app: { language: v } })}
          options={[
            { value: 'es', label: 'Español', hint: 'Disponible' },
            { value: 'en', label: 'English', hint: 'Próximamente' },
            { value: 'pt', label: 'Português', hint: 'Em breve' },
          ]}
        />
      </Section>
    </Page>
  )
}

export function DataUsagePage({ back }: PageProps) {
  const { settings, update } = useSettings()
  return (
    <Page title="Uso de datos y multimedia" onBack={back}>
      <Section>
        <Toggle icon={Gauge} label="Ahorro de datos" hint="Cargamos las fotos en menor calidad cuando usás datos móviles." checked={settings.feed.dataSaver} onChange={(v) => update({ feed: { dataSaver: v } })} />
        <Toggle icon={PlayCircle} label="Reproducción automática" hint="Los videos de la Vitrina arrancan solos al aparecer." checked={settings.feed.autoplay} onChange={(v) => update({ feed: { autoplay: v } })} />
      </Section>
      <Section>
        <Row icon={settings.feed.dataSaver ? EyeOff : Eye} label="Calidad de las fotos" value={settings.feed.dataSaver ? 'Ahorro' : 'Alta'} />
        <Row icon={ShieldAlert} label="Caché" hint="Las fotos que ya viste quedan guardadas en tu navegador para cargar más rápido." />
      </Section>
    </Page>
  )
}

