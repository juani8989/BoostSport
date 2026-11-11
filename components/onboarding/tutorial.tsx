'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Folder,
  Handshake,
  HandHeart,
  Heart,
  Link2,
  MessageCircle,
  Moon,
  Newspaper,
  Plus,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  Type,
  UserRound,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCheer } from '@/components/app/cheer'
import { cn } from '@/lib/utils'

type Role = 'deportista' | 'empresa' | 'evento'

type Step = {
  id: string
  title: string
  body: React.ReactNode
  demo: React.ReactNode
  tip?: string
}

/** A little phone frame where each gesture is shown in a loop. */
function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative h-56 w-36 overflow-hidden rounded-[1.6rem] border-4 border-foreground/80 bg-secondary shadow-2xl', className)}>
      <span aria-hidden className="absolute left-1/2 top-1.5 z-20 h-1.5 w-10 -translate-x-1/2 rounded-full bg-foreground/60" />
      {children}
    </div>
  )
}

const photo = 'linear-gradient(160deg, #0081c8 0%, #00a651 45%, #fcb131 80%, #ee334e 100%)'

function Finger({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <span aria-hidden className={cn('absolute size-9 rounded-full border-2 border-white bg-white/50 shadow-lg', className)}>
      {children}
    </span>
  )
}

const demos = {
  welcome: (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {['#0081c8', '#fcb131', '#c8c8c8', '#00a651', '#ee334e'].map((c, i) => (
          <span key={c} className="animate-tut-float size-7 rounded-full border-4" style={{ borderColor: c, animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <span className="font-display text-4xl font-black italic">BoostSport</span>
    </div>
  ),
  feed: (
    <Phone>
      <div className="animate-tut-scroll absolute inset-x-0 top-0 h-[200%]">
        {[photo, 'linear-gradient(160deg,#ee334e,#fcb131)'].map((bg, i) => (
          <div key={i} className="relative h-1/2 p-3" style={{ background: bg }}>
            <span className="absolute bottom-10 left-3 h-2 w-16 rounded bg-white/80" />
            <span className="absolute bottom-6 left-3 h-2 w-10 rounded bg-white/60" />
            <span className="absolute bottom-6 right-2 flex flex-col gap-1.5">
              {[0, 1, 2].map((k) => (
                <span key={k} className="size-4 rounded-full bg-white/70" />
              ))}
            </span>
          </div>
        ))}
      </div>
      <Finger className="animate-tut-scroll bottom-8 left-1/2 -ml-4" />
    </Phone>
  ),
  like: (
    <Phone>
      <div className="absolute inset-0" style={{ background: photo }} />
      <Finger className="animate-tut-tap left-12 top-20" />
      <Heart className="animate-tut-heart absolute left-9 top-16 size-16 fill-olympic-red text-olympic-red drop-shadow-xl" />
    </Phone>
  ),
  support: (
    <Phone>
      <div className="absolute inset-0" style={{ background: photo }} />
      <Finger className="animate-tut-hold left-12 top-20" />
      <span className="animate-tut-heart absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-olympic-yellow px-2 py-1 font-display text-base font-black italic text-olympic-black shadow-xl">
        ¡VAMOS!
      </span>
      <span className="absolute bottom-3 left-2 flex items-center gap-1 rounded-full bg-olympic-yellow/90 px-2 py-0.5 text-[9px] font-bold text-olympic-black">
        <HandHeart className="size-3" /> Apoyado por vos
      </span>
    </Phone>
  ),
  zoom: (
    <Phone>
      <div className="animate-tut-zoom absolute inset-0" style={{ background: photo }}>
        <span className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/80" />
      </div>
      <Finger className="animate-tut-pinch-a left-[3.2rem] top-[5.5rem]" />
      <Finger className="animate-tut-pinch-b left-[4.4rem] top-[6.7rem]" />
    </Phone>
  ),
  save: (
    <div className="flex items-center gap-4">
      <IconBubble icon={MessageCircle} className="bg-olympic-blue text-olympic-white" />
      <IconBubble icon={Bookmark} className="bg-olympic-yellow text-olympic-black" delay={150} />
      <IconBubble icon={Folder} className="bg-olympic-green text-olympic-white" delay={300} />
    </div>
  ),
  share: (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[
          { label: 'WhatsApp', bg: '#25d366', icon: MessageCircle },
          { label: 'Telegram', bg: '#229ed9', icon: Send },
          { label: 'Copiar', bg: '#c8c8c8', icon: Link2 },
          { label: 'Más', bg: '#0081c8', icon: Share2 },
        ].map((n, i) => (
          <span key={n.label} className="animate-tut-float flex flex-col items-center gap-1 text-[10px] font-semibold" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="flex size-11 items-center justify-center rounded-full text-white shadow-lg" style={{ background: n.bg }}>
              <n.icon className="size-5" />
            </span>
            {n.label}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">…y deslizá para ver más opciones</span>
    </div>
  ),
  match: (
    <Phone>
      <div className="absolute inset-x-2 bottom-12 top-6 rounded-2xl bg-card shadow" />
      <div className="animate-tut-card absolute inset-x-2 bottom-12 top-5 overflow-hidden rounded-2xl shadow-xl" style={{ background: photo }}>
        <span className="animate-tut-like-stamp absolute left-2 top-3 -rotate-12 rounded border-2 border-olympic-green bg-white/70 px-1 text-[10px] font-black text-olympic-green">ME INTERESA</span>
        <span className="animate-tut-pass-stamp absolute right-2 top-3 rotate-12 rounded border-2 border-olympic-red bg-white/70 px-1 text-[10px] font-black text-olympic-red">PASO</span>
      </div>
      <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3">
        <span className="flex size-7 items-center justify-center rounded-full border-2 border-olympic-red bg-background text-olympic-red">
          <X className="size-4" />
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-olympic-green text-olympic-white">
          <Heart className="size-4 fill-current" />
        </span>
      </span>
    </Phone>
  ),
  chat: (
    <div className="flex w-56 flex-col gap-2">
      <span className="self-start rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-xs">¡Hola! Nos encantó tu perfil 👋</span>
      <span className="self-end rounded-2xl rounded-br-sm bg-olympic-blue px-3 py-2 text-xs text-olympic-white">¡Gracias! ¿Qué tienen en mente?</span>
      <span className="animate-tut-float flex items-center gap-2 self-start rounded-2xl border border-olympic-yellow bg-olympic-yellow/15 px-3 py-2 text-xs font-semibold">
        <Handshake className="size-4 text-olympic-yellow" /> Propuesta: indumentaria · 6 meses
      </span>
    </div>
  ),
  profile: (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border-2 border-foreground">
          <Plus className="size-5" />
        </span>
        <span className="flex size-16 items-center justify-center rounded-full bg-secondary ring-4 ring-olympic-blue">
          <UserRound className="size-8 text-muted-foreground" />
        </span>
        <span className="flex size-10 items-center justify-center rounded-xl border-2 border-foreground">
          <Bookmark className="size-5" />
        </span>
      </div>
      <div className="flex gap-2 text-[11px] font-bold uppercase tracking-wide">
        <span className="rounded-full bg-foreground px-2.5 py-1 text-background">Publicaciones</span>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
          <Newspaper className="size-3" /> Menciones
        </span>
      </div>
    </div>
  ),
  notifications: (
    <div className="flex w-60 flex-col gap-2">
      {[
        { icon: Heart, text: 'A Ana le gustó tu publicación', tone: 'bg-olympic-red' },
        { icon: UserRound, text: 'Tomás empezó a seguirte', tone: 'bg-olympic-blue' },
        { icon: Handshake, text: '¡Hicieron match con Andes Sport!', tone: 'bg-olympic-green' },
      ].map((n, i) => (
        <span key={n.text} className="animate-tut-float flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs" style={{ animationDelay: `${i * 200}ms` }}>
          <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-white', n.tone)}>
            <n.icon className="size-3.5" />
          </span>
          {n.text}
        </span>
      ))}
    </div>
  ),
  settings: (
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: Moon, label: 'Tema' },
        { icon: Type, label: 'Texto' },
        { icon: Bell, label: 'Avisos' },
        { icon: ShieldCheck, label: 'Privacidad' },
        { icon: MessageCircle, label: 'Mensajes' },
        { icon: Settings2, label: 'Y más' },
      ].map((o, i) => (
        <span key={o.label} className="animate-tut-float flex flex-col items-center gap-1 text-[10px] font-semibold" style={{ animationDelay: `${i * 100}ms` }}>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
            <o.icon className="size-5" />
          </span>
          {o.label}
        </span>
      ))}
    </div>
  ),
}

function IconBubble({ icon: Icon, className, delay = 0 }: { icon: LucideIcon; className: string; delay?: number }) {
  return (
    <span className={cn('animate-tut-float flex size-14 items-center justify-center rounded-full shadow-lg', className)} style={{ animationDelay: `${delay}ms` }}>
      <Icon className="size-6" />
    </span>
  )
}

function stepsFor(role: Role, name: string): Step[] {
  const athlete = role === 'deportista'
  const first = name.split(' ')[0]
  return [
    {
      id: 'welcome',
      title: `¡Bienvenido, ${first}!`,
      body: athlete
        ? 'BoostSport conecta deportistas con marcas e instituciones que buscan a quién apoyar. Te mostramos en un minuto cómo sacarle el jugo.'
        : 'BoostSport te conecta con deportistas que buscan apoyo y con eventos donde sumarte. Te mostramos en un minuto cómo sacarle el jugo.',
      demo: demos.welcome,
    },
    {
      id: 'feed',
      title: 'Recorré el feed',
      body: 'En Inicio, deslizá hacia arriba o abajo para pasar de una publicación a otra. Arriba elegís entre Compañeros, Sponsors y Eventos.',
      demo: demos.feed,
    },
    {
      id: 'like',
      title: 'Doble toque: me gusta',
      body: 'Tocá dos veces seguidas sobre una publicación y le das me gusta. También podés usar el corazón de la derecha.',
      demo: demos.like,
    },
    {
      id: 'support',
      title: 'Apoyá a quien admirás',
      body: (
        <>
          Hacé doble toque y <strong>mantené apretado el segundo</strong>, o tocá la mano con corazón. El apoyo vale más que un me gusta: recomparte la publicación, la muestra a más gente y suma a los Apoyos del deportista, que es lo que miran las marcas.
        </>
      ),
      demo: demos.support,
    },
    {
      id: 'zoom',
      title: 'Hacé zoom',
      body: 'Separá dos dedos sobre una foto para acercarla y juntalos para alejarla. En la vista de publicaciones también tenés la lupa.',
      demo: demos.zoom,
    },
    {
      id: 'save',
      title: 'Comentá y guardá',
      body: 'Dejá un comentario o un aliento con el globito. Con el marcador guardás lo que te interesa y lo podés ordenar en carpetas; lo encontrás en Guardados, desde tu perfil.',
      demo: demos.save,
    },
    {
      id: 'share',
      title: 'Compartí',
      body: 'Con el botón de compartir mandás una publicación por WhatsApp, Telegram, X, Facebook, LinkedIn, mail o a uno de tus chats de BoostSport. También podés copiar el link.',
      demo: demos.share,
    },
    {
      id: 'match',
      title: 'Matcheá',
      body: athlete
        ? 'En Match aparecen marcas que podrían patrocinarte. Deslizá a la derecha si te interesa y a la izquierda para pasar. Si la marca también te elige, ¡es un match! Tocá la (i) para ver qué ofrece.'
        : 'En Match aparecen deportistas que podrían ser la cara de tu marca o de tu evento. Deslizá a la derecha si te interesa y a la izquierda para pasar. Si también te elige, ¡es un match!',
      demo: demos.match,
    },
    {
      id: 'chat',
      title: 'Hablá y cerrá acuerdos',
      body: athlete
        ? 'Con cada match se abre un chat en Mensajes. Ahí recibís propuestas de producto, dinero o embajada, y las aceptás o hacés una contrapropuesta.'
        : 'Con cada match se abre un chat en Mensajes. Desde ahí mandás propuestas de producto, dinero, embajada o sponsoreo de un evento.',
      demo: demos.chat,
    },
    {
      id: 'profile',
      title: 'Tu perfil',
      body: athlete
        ? 'Con el + de tu perfil publicás tu día, una meta, una idea o una nota donde aparecés. En Mis datos completás lo que ven las marcas, y en Menciones juntamos noticias, entrevistas y videos sobre vos.'
        : 'En tu perfil mostrás quiénes son y qué buscan. Tocá Editar perfil para completarlo: cuanto más claro, más deportistas te eligen.',
      demo: demos.profile,
      tip: athlete ? 'Cargá tus apodos en Mis datos para que te encontremos en más noticias.' : undefined,
    },
    {
      id: 'notifications',
      title: 'Enterate de todo',
      body: 'La campanita te avisa cuando alguien te sigue, reacciona a tus publicaciones, te escribe o te manda una propuesta. Tocá cada aviso para ir directo a lo que pasó.',
      demo: demos.notifications,
    },
    {
      id: 'settings',
      title: 'Hacelo a tu manera',
      body: 'Desde Configuración (el ☰) cambiás el tema claro u oscuro, el tamaño del texto, quién puede escribirte o comentarte, qué notificaciones recibir, a quién bloquear o silenciar, y mucho más.',
      demo: demos.settings,
      tip: 'Podés volver a ver este tutorial cuando quieras desde Configuración → Ayuda.',
    },
  ]
}

/** First-run walkthrough: what each part of the app does, with a short looping demo per step. */
export function Tutorial({ role, name, onDone, onOpenSettings }: { role: Role; name: string; onDone: () => void; onOpenSettings: () => void }) {
  const steps = stepsFor(role, name)
  const [index, setIndex] = useState(0)
  const [cheer, fireCheer] = useCheer()
  const touch = useRef<number | null>(null)
  const step = steps[index]
  const last = index === steps.length - 1

  const go = (delta: number) => setIndex((i) => Math.max(0, Math.min(steps.length - 1, i + delta)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (step.id === 'support') fireCheer()
  }, [step.id, fireCheer])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cómo usar BoostSport"
      className="fixed inset-0 z-[80] flex flex-col bg-background animate-in fade-in duration-300 motion-reduce:animate-none"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
      }}
    >
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-5">
        <div className="flex flex-1 gap-1" aria-label={`Paso ${index + 1} de ${steps.length}`}>
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Ir al paso ${i + 1}: ${s.title}`}
              onClick={() => setIndex(i)}
              className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= index ? 'bg-olympic-blue' : 'bg-secondary')}
            />
          ))}
        </div>
        {last ? null : (
          <button type="button" onClick={onDone} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary">
            Saltar
          </button>
        )}
      </header>

      <div key={step.id} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-8 text-center animate-in fade-in slide-in-from-right-6 duration-300 motion-reduce:animate-none">
        <div className="relative flex min-h-56 items-center justify-center">
          {step.demo}
          {step.id === 'support' ? cheer : null}
        </div>
        <div className="flex max-w-md flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-olympic-blue">
            {index + 1} de {steps.length}
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight">{step.title}</h2>
          <p className="text-pretty text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
          {step.tip ? <p className="rounded-xl bg-olympic-yellow/15 px-4 py-2.5 text-sm leading-relaxed">💡 {step.tip}</p> : null}
        </div>
      </div>

      <footer className="flex items-center gap-3 px-4 pb-8 pt-4 md:justify-center">
        {index > 0 ? (
          <button type="button" onClick={() => go(-1)} aria-label="Paso anterior" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="size-5" />
          </button>
        ) : null}
        {last ? (
          <div className="flex flex-1 flex-col gap-2 md:max-w-sm">
            <button type="button" onClick={onDone} className="rounded-full bg-olympic-blue px-6 py-3.5 font-bold text-olympic-white">
              ¡Empezar!
            </button>
            <button type="button" onClick={() => (onDone(), onOpenSettings())} className="rounded-full bg-secondary px-6 py-3 text-sm font-bold">
              Abrir Configuración
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => go(1)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olympic-blue px-6 py-3.5 font-bold text-olympic-white md:max-w-sm">
            {index === 0 ? 'Empecemos' : 'Siguiente'} <ArrowRight className="size-5" />
          </button>
        )}
      </footer>
    </div>
  )
}

/** Lets other screens (Ayuda) open the tutorial again. */
export const OPEN_TUTORIAL_EVENT = 'boostsport:open-tutorial'
