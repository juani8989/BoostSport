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

/**
 * Every country, named in Spanish. BoostSport is for athletes from anywhere (Argentina, Chile,
 * Brasil, Bélgica…), not only Latin America.
 */
const COUNTRY_CODES =
  'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK YE ZA ZM ZW'.split(' ')

const regionName = (() => {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' })
  } catch {
    return null
  }
})()

export const countries = [...new Set(COUNTRY_CODES.map((code) => regionName?.of(code) ?? code))].sort((a, b) => a.localeCompare(b, 'es'))

export const needOptions = ['Indumentaria', 'Equipamiento', 'Viajes', 'Dinero', 'Nutrición', 'Visibilidad']
