import type { Role } from '@/lib/auth-store'

export const roleConfig: Record<
  Role,
  {
    label: string
    tagline: string
    bg: string
    text: string
    ring: string
    button: string
  }
> = {
  deportista: {
    label: 'Atleta',
    tagline: 'Mostrá tu camino y conseguí sponsors',
    bg: 'bg-olympic-blue',
    text: 'text-olympic-white',
    ring: 'border-olympic-blue',
    button: 'bg-olympic-blue text-olympic-white',
  },
  empresa: {
    label: 'Sponsor',
    tagline: 'Encontrá la cara de tu marca',
    bg: 'bg-olympic-yellow',
    text: 'text-olympic-black',
    ring: 'border-olympic-yellow',
    button: 'bg-olympic-yellow text-olympic-black',
  },
  evento: {
    label: 'Institución',
    tagline: 'Sumá deportistas a tu competencia',
    bg: 'bg-olympic-green',
    text: 'text-olympic-white',
    ring: 'border-olympic-green',
    button: 'bg-olympic-green text-olympic-white',
  },
}

const logo = (slug: string) => `https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${slug}/default.svg`

export const brandLogos = [
  { name: 'Nike', src: logo('nike') },
  { name: 'Adidas', src: logo('adidas') },
  { name: 'Puma', src: logo('puma') },
  { name: 'Powerade', src: logo('powerade') },
  { name: 'Under Armour', src: logo('under-armour') },
  { name: 'Red Bull', src: logo('red-bull') },
  { name: 'New Balance', src: logo('new-balance') },
  { name: 'Reebok', src: logo('reebok') },
  { name: 'Coca-Cola', src: logo('coca-cola') },
]

export const eventImages = [
  { name: 'Juegos Olímpicos', src: '/images/event-stadium.webp' },
  { name: 'Maratones', src: '/images/event-marathon.webp' },
  { name: 'Torneos', src: '/images/event-arena.webp' },
  { name: 'Vueltas ciclistas', src: '/images/event-cycling.webp' },
]

export const disciplines = [
  'Atletismo', 'Básquet', 'Boxeo', 'Ciclismo', 'Esgrima', 'Fútbol', 'Gimnasia', 'Handball',
  'Hockey', 'Judo', 'Karate', 'Lucha', 'Natación', 'Remo', 'Rugby', 'Skateboarding',
  'Surf', 'Taekwondo', 'Tenis', 'Tiro', 'Vela', 'Vóley',
]

export const countries = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador',
  'España', 'Estados Unidos', 'Guatemala', 'México', 'Paraguay', 'Perú', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela',
]

export const needOptions = ['Indumentaria', 'Equipamiento', 'Viajes', 'Dinero', 'Nutrición', 'Visibilidad']
