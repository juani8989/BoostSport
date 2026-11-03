export type Level = 'Amateur' | 'Semi-pro' | 'Pro'

export type Athlete = {
  id: string
  name: string
  handle: string
  sport: string
  city: string
  category: string
  level: Level
  image: string
  followers: string
  sponsorReady: number
  seekingSponsor: boolean
  sponsoredBy?: string
}

export const athletes: Record<string, Athlete> = {
  valentina: {
    id: 'valentina',
    name: 'Valentina Ríos',
    handle: '@valerios400',
    sport: 'Atletismo · 400 m',
    city: 'Córdoba',
    category: 'Sub-23',
    level: 'Semi-pro',
    image: '/images/runner.webp',
    followers: '12,4 k',
    sponsorReady: 82,
    seekingSponsor: true,
  },
  mateo: {
    id: 'mateo',
    name: 'Mateo Ibáñez',
    handle: '@mateo.mariposa',
    sport: 'Natación · Mariposa',
    city: 'Rosario',
    category: 'Mayores',
    level: 'Pro',
    image: '/images/swimmer.webp',
    followers: '31,2 k',
    sponsorReady: 91,
    seekingSponsor: true,
    sponsoredBy: 'Aqualine',
  },
  camila: {
    id: 'camila',
    name: 'Camila Sosa',
    handle: '@cami.guantes',
    sport: 'Boxeo · 57 kg',
    city: 'Buenos Aires',
    category: 'Sub-21',
    level: 'Amateur',
    image: '/images/boxer.webp',
    followers: '5,8 k',
    sponsorReady: 64,
    seekingSponsor: true,
  },
  tomas: {
    id: 'tomas',
    name: 'Tomás Vera',
    handle: '@tomasvera.bike',
    sport: 'Ciclismo de ruta',
    city: 'Mendoza',
    category: 'Sub-23',
    level: 'Semi-pro',
    image: '/images/podium.webp',
    followers: '18,9 k',
    sponsorReady: 87,
    seekingSponsor: true,
  },
  lucas: {
    id: 'lucas',
    name: 'Lucas Peña',
    handle: '@lucaspena.sk8',
    sport: 'Skateboarding',
    city: 'Montevideo',
    category: 'Sub-18',
    level: 'Amateur',
    image: '/images/skater.webp',
    followers: '44,1 k',
    sponsorReady: 73,
    seekingSponsor: true,
  },
  sofia: {
    id: 'sofia',
    name: 'Sofía Duarte',
    handle: '@sofi.diez',
    sport: 'Fútbol · Mediocampista',
    city: 'Santiago',
    category: 'Sub-20',
    level: 'Semi-pro',
    image: '/images/footballer.webp',
    followers: '22,7 k',
    sponsorReady: 79,
    seekingSponsor: false,
    sponsoredBy: 'Club Andino',
  },
  martina: {
    id: 'martina',
    name: 'Martina Acosta',
    handle: '@martiacosta.tenis',
    sport: 'Tenis · Singles',
    city: 'Tandil',
    category: 'Sub-18',
    level: 'Semi-pro',
    image: '/images/tennis.webp',
    followers: '9,3 k',
    sponsorReady: 84,
    seekingSponsor: true,
  },
  joaquin: {
    id: 'joaquin',
    name: 'Joaquín Herrera',
    handle: '@joaco.dobla',
    sport: 'Básquet · Base',
    city: 'Bahía Blanca',
    category: 'Sub-21',
    level: 'Semi-pro',
    image: '/images/basketball.webp',
    followers: '15,6 k',
    sponsorReady: 80,
    seekingSponsor: true,
  },
  agustina: {
    id: 'agustina',
    name: 'Agustina Molina',
    handle: '@agus.remate',
    sport: 'Vóley · Punta',
    city: 'San Juan',
    category: 'Mayores',
    level: 'Pro',
    image: '/images/volleyball.webp',
    followers: '27,8 k',
    sponsorReady: 88,
    seekingSponsor: true,
  },
  delfina: {
    id: 'delfina',
    name: 'Delfina Paz',
    handle: '@delfi.viga',
    sport: 'Gimnasia artística',
    city: 'La Plata',
    category: 'Sub-16',
    level: 'Amateur',
    image: '/images/gymnast.webp',
    followers: '6,1 k',
    sponsorReady: 70,
    seekingSponsor: true,
  },
  pilar: {
    id: 'pilar',
    name: 'Pilar Quiroga',
    handle: '@pili.hockey',
    sport: 'Hockey sobre césped',
    city: 'Tucumán',
    category: 'Sub-21',
    level: 'Semi-pro',
    image: '/images/hockey.webp',
    followers: '19,4 k',
    sponsorReady: 83,
    seekingSponsor: true,
  },
  bruno: {
    id: 'bruno',
    name: 'Bruno Salvatierra',
    handle: '@bruno.bloque',
    sport: 'Escalada deportiva',
    city: 'Bariloche',
    category: 'Mayores',
    level: 'Semi-pro',
    image: '/images/climber.webp',
    followers: '11,2 k',
    sponsorReady: 76,
    seekingSponsor: true,
  },
  nicolas: {
    id: 'nicolas',
    name: 'Nicolás Benítez',
    handle: '@nico.ippon',
    sport: 'Judo · -73 kg',
    city: 'Rosario',
    category: 'Sub-21',
    level: 'Amateur',
    image: '/images/judo.webp',
    followers: '4,7 k',
    sponsorReady: 66,
    seekingSponsor: true,
  },
  abril: {
    id: 'abril',
    name: 'Abril Cardozo',
    handle: '@abril.olas',
    sport: 'Surf · Shortboard',
    city: 'Mar del Plata',
    category: 'Sub-20',
    level: 'Semi-pro',
    image: '/images/surfer.webp',
    followers: '33,5 k',
    sponsorReady: 85,
    seekingSponsor: true,
  },
}

export type RutaPost =
  | {
      id: string
      type: 'goal'
      athleteId: string
      image: string
      title: string
      daysLeft: number
      progress: number
      nextStep: string
    }
  | {
      id: string
      type: 'project'
      athleteId: string
      image: string
      title: string
      raised: number
      goal: number
      breakdown: { label: string; amount: number }[]
    }
  | {
      id: string
      type: 'clip'
      athleteId: string
      image: string
      caption: string
      tags: string[]
    }
  | {
      id: string
      type: 'colab'
      athleteIds: [string, string]
      caption: string
    }
  | {
      id: string
      type: 'diary'
      athleteId: string
      images: string[]
      caption: string
    }

export const rutaPosts: RutaPost[] = [
  {
    id: 'r1',
    type: 'project',
    athleteId: 'valentina',
    image: '/images/runner.webp',
    title: 'Necesito llegar al Sudamericano de Lima',
    raised: 640,
    goal: 1500,
    breakdown: [
      { label: 'Pasajes', amount: 820 },
      { label: 'Inscripción', amount: 180 },
      { label: 'Clavos y equipo', amount: 500 },
    ],
  },
  {
    id: 'r2',
    type: 'goal',
    athleteId: 'camila',
    image: '/images/boxer.webp',
    title: 'Clasificar al Nacional Juvenil',
    daysLeft: 47,
    progress: 62,
    nextStep: 'Selectivo regional · 3 peleas',
  },
  {
    id: 'r3',
    type: 'colab',
    athleteIds: ['valentina', 'sofia'],
    caption: 'Pasadas de velocidad con @sofi.diez. Ella pone la técnica y yo el ritmo.',
  },
  {
    id: 'r4',
    type: 'clip',
    athleteId: 'lucas',
    image: '/images/skater.webp',
    caption: 'Kickflip número 400 de la semana. Primer kickflip limpio en el bowl grande.',
    tags: ['Skate', 'Montevideo', 'Sub-18'],
  },
  {
    id: 'r5',
    type: 'diary',
    athleteId: 'mateo',
    images: ['/images/swimmer.webp', '/images/brand-drink.webp', '/images/swimmer.webp'],
    caption: 'Mi semana: 42 km nadados, 2 sesiones de gimnasio y cero excusas.',
  },
]

export type VitrinaPost =
  | {
      id: string
      type: 'achievement'
      athleteId: string
      image: string
      title: string
      event: string
      medal: 'Oro' | 'Plata' | 'Bronce'
      verifiedBy: string
    }
  | {
      id: string
      type: 'stats'
      athleteId: string
      image: string
      metric: string
      current: string
      points: number[]
      summary: string
    }
  | {
      id: string
      type: 'secret'
      athleteId: string
      image: string
      title: string
      teaser: string
      content: string[]
    }

export const vitrinaPosts: VitrinaPost[] = [
  {
    id: 'v1',
    type: 'achievement',
    athleteId: 'tomas',
    image: '/images/podium.webp',
    title: 'Campeón Nacional de Ruta Sub-23',
    event: 'Nacional de Ciclismo · San Juan 2026',
    medal: 'Oro',
    verifiedBy: 'Federación Ciclista',
  },
  {
    id: 'v2',
    type: 'stats',
    athleteId: 'valentina',
    image: '/images/runner.webp',
    metric: '400 m llanos',
    current: '53,84 s',
    points: [56.1, 55.7, 55.2, 54.9, 54.6, 54.2, 53.84],
    summary: 'Bajó 2,26 s en un año',
  },
  {
    id: 'v3',
    type: 'secret',
    athleteId: 'valentina',
    image: '/images/runner.webp',
    title: 'Mi plan de temporada completo',
    teaser: 'Rutina, dieta y cómo manejo los nervios antes de una final.',
    content: [
      'Lunes: 6 × 300 m al 90 % con 3 min de pausa',
      'Miércoles: fuerza en gimnasio y pliometría',
      'Dieta: 2.600 kcal con carga de hidratos el día previo',
      'Antes de la final: respiración 4-7-8 y la misma playlist de siempre',
    ],
  },
  {
    id: 'v4',
    type: 'achievement',
    athleteId: 'mateo',
    image: '/images/swimmer.webp',
    title: 'Récord provincial en 100 m mariposa',
    event: 'Torneo Federal · Rosario',
    medal: 'Plata',
    verifiedBy: 'Confederación de Natación',
  },
]

export type Callout = {
  id: string
  brand: string
  brandInitials: string
  image: string
  headline: string
  requirements: string[]
  benefits: string[]
  deadline: string
  affinity: number
  dealType: 'Producto' | 'Dinero' | 'Embajador'
}

export const callouts: Callout[] = [
  {
    id: 'c1',
    brand: 'Andes Sport',
    brandInitials: 'AS',
    image: '/images/brand-campaign.webp',
    headline: 'Buscamos corredora sub-23 en Córdoba para la campaña de invierno',
    requirements: ['Atletismo de pista', 'Sub-23', 'Córdoba o alrededores'],
    benefits: ['Equipamiento anual', 'Pago por campaña', 'Viajes a 2 torneos'],
    deadline: 'Cierra en 48 h',
    affinity: 92,
    dealType: 'Embajador',
  },
  {
    id: 'c2',
    brand: 'Hidra+',
    brandInitials: 'H+',
    image: '/images/brand-drink.webp',
    headline: 'Hidratación para deportistas de resistencia que entrenan todos los días',
    requirements: ['Deportes de resistencia', 'Publicar 2 veces por semana', '+3 k seguidores'],
    benefits: ['Producto mensual', 'Bonus por objetivo cumplido'],
    deadline: 'Cierra en 6 días',
    affinity: 78,
    dealType: 'Producto',
  },
]

export const companyName = 'Andes Sport'

export const companyFeedAthletes = ['valentina', 'tomas', 'camila', 'lucas']

export const affinityByAthlete: Record<string, number> = {
  valentina: 92,
  tomas: 86,
  camila: 74,
  lucas: 68,
}
