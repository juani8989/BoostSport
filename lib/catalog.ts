import { athletes } from '@/lib/data'

export type Challenge = {
  id: string
  title: string
  detail: string
  reward: string
  deadline: string
}

export type Company = {
  key: string
  name: string
  initials: string
  industry: string
  image: string
  about: string
  lookingFor: string[]
  sports: string[]
  howToAccess: string[]
  benefits: string[]
  offers: string[]
  challenges: Challenge[]
}

export type SportEvent = {
  id: string
  name: string
  kind: 'Juegos Olímpicos' | 'Carrera' | 'Torneo' | 'Vuelta'
  date: string
  place: string
  image: string
  about: string
  attendees: string[]
  figures: string[]
  sponsors: string[]
  howToRegister: string
  requirements: string[]
  impact: string
  registrationOpen: boolean
}

export type DailyKind = 'diario' | 'idea' | 'colab' | 'meta'

export type SeedDaily = {
  id: string
  athleteId: string
  kind: DailyKind
  body: string
  image: string
  minutesAgo: number
  baseLikes: number
  baseComments: { author: string; body: string }[]
}

export const companies: Company[] = [
  {
    key: 'seed:co-andes',
    name: 'Andes Sport',
    initials: 'AS',
    industry: 'Indumentaria de running y outdoor',
    image: '/images/brand-campaign.webp',
    about: 'Diseñamos ropa técnica en Mendoza para correr, pedalear y subir montañas.',
    lookingFor: ['Corredores y ciclistas sub-23', 'Constancia publicando entrenos', 'Base en Argentina o Chile'],
    sports: ['atletismo', 'ciclismo', 'trail', 'triatlón', 'maratón'],
    howToAccess: ['Hacé match desde la sección Match', 'O completá uno de nuestros desafíos', 'Respondemos en 72 h'],
    benefits: ['Kit completo por temporada', 'Viáticos a 2 competencias', 'Campaña de invierno pagada'],
    offers: ['Indumentaria', 'Viajes', 'Visibilidad'],
    challenges: [
      {
        id: 'andes-10k',
        title: '10K en tu ciudad',
        detail: 'Corré 10 km por tu barrio y contá en 1 minuto por qué lo hacés.',
        reward: 'Kit de invierno + entrevista con el equipo',
        deadline: 'Cierra el 15 de noviembre',
      },
      {
        id: 'andes-subida',
        title: 'La subida más dura',
        detail: 'Mostranos la cuesta que más te cuesta y cómo la entrenás.',
        reward: 'Zapatillas de trail edición limitada',
        deadline: 'Cierra el 30 de noviembre',
      },
    ],
  },
  {
    key: 'seed:co-hydra',
    name: 'Hydra+',
    initials: 'H+',
    industry: 'Bebida isotónica',
    image: '/images/brand-drink.webp',
    about: 'Hidratación pensada para deportistas de resistencia, con fórmula de laboratorio argentino.',
    lookingFor: ['Deportistas de resistencia', 'Contenido honesto del día a día', 'Comunidad activa'],
    sports: ['natación', 'atletismo', 'ciclismo', 'triatlón', 'remo', 'fútbol'],
    howToAccess: ['Postulate a un desafío', 'Necesitás al menos 3 publicaciones'],
    benefits: ['Producto ilimitado', 'Plan nutricional', 'Fee mensual para embajadores'],
    offers: ['Nutrición', 'Dinero', 'Visibilidad'],
    challenges: [
      {
        id: 'hydra-dia',
        title: 'Un día conmigo',
        detail: 'Contá tu día de entrenamiento de principio a fin en un video de 30 s.',
        reward: 'Embajador por 3 meses + USD 300',
        deadline: 'Cierra el 10 de noviembre',
      },
    ],
  },
  {
    key: 'seed:co-golpe',
    name: 'Golpe Fight Gear',
    initials: 'GF',
    industry: 'Equipamiento de deportes de combate',
    image: '/images/boxer.webp',
    about: 'Guantes, protecciones y ropa para boxeo, karate, judo, taekwondo y lucha.',
    lookingFor: ['Deportistas de combate juveniles', 'Resultados en torneos nacionales', 'Actitud de equipo'],
    sports: ['boxeo', 'karate', 'judo', 'taekwondo', 'lucha', 'mma'],
    howToAccess: ['Match directo', 'Subí tu último combate al feed'],
    benefits: ['Equipamiento completo', 'Inscripción a torneos', 'Contenido en nuestras redes'],
    offers: ['Equipamiento', 'Viajes', 'Visibilidad'],
    challenges: [
      {
        id: 'golpe-round',
        title: 'Tu mejor round',
        detail: 'Mostranos un round de sparring y explicá la técnica que estás trabajando.',
        reward: 'Set de guantes y protecciones',
        deadline: 'Cierra el 20 de noviembre',
      },
    ],
  },
  {
    key: 'seed:co-ruedas',
    name: 'Ruedas Skate Co.',
    initials: 'RS',
    industry: 'Skate y deportes urbanos',
    image: '/images/skater.webp',
    about: 'Tablas hechas en Montevideo, para el barrio y para el podio olímpico.',
    lookingFor: ['Skaters y BMX', 'Estilo propio', 'Comunidad en redes'],
    sports: ['skateboarding', 'skate', 'bmx', 'surf', 'escalada'],
    howToAccess: ['Hacé match', 'O mandá tu mejor truco en el desafío'],
    benefits: ['Tablas y piezas ilimitadas', 'Viajes a tours', 'Línea de firma propia'],
    offers: ['Equipamiento', 'Viajes', 'Dinero'],
    challenges: [
      {
        id: 'ruedas-truco',
        title: 'El truco del mes',
        detail: 'Tu mejor truco en un solo intento, sin cortes.',
        reward: 'Tabla de firma + tour por Uruguay',
        deadline: 'Cierra el 5 de diciembre',
      },
    ],
  },
  {
    key: 'seed:co-pampa',
    name: 'Pampa Pay',
    initials: 'PP',
    industry: 'Billetera digital',
    image: '/images/footballer.webp',
    about: 'Apoyamos el camino olímpico de deportistas de cualquier disciplina con becas mensuales.',
    lookingFor: ['Deportistas con objetivo olímpico', 'Cualquier disciplina', 'Historias de superación'],
    sports: ['*'],
    howToAccess: ['Postulate con tu objetivo más grande', 'Evaluamos cada mes'],
    benefits: ['Beca mensual', 'Mentoría financiera', 'Seguro deportivo'],
    offers: ['Dinero', 'Visibilidad'],
    challenges: [
      {
        id: 'pampa-meta',
        title: 'Mi camino a LA 2028',
        detail: 'Contanos tu plan para llegar a los Juegos Olímpicos y qué necesitás para lograrlo.',
        reward: 'Beca de USD 500 por mes durante 1 año',
        deadline: 'Cierra el 31 de diciembre',
      },
    ],
  },
]

export const events: SportEvent[] = [
  {
    id: 'la-2028',
    name: 'Juegos Olímpicos LA 2028',
    kind: 'Juegos Olímpicos',
    date: '14 jul – 30 jul 2028',
    place: 'Los Ángeles, Estados Unidos',
    image: '/images/event-stadium.webp',
    about: 'La cita máxima del deporte, con 36 deportes y más de 10.000 atletas.',
    attendees: ['mateo', 'valentina', 'tomas'],
    figures: ['Paula Pareto (embajadora)', 'Delfina Pignatiello', 'Santiago Lange'],
    sponsors: ['Pampa Pay', 'Hydra+', 'Andes Sport'],
    howToRegister: 'Clasificación por ranking o marca mínima de cada federación internacional.',
    requirements: ['Marca mínima olímpica', 'Aval del Comité Olímpico de tu país', 'Pasaporte vigente'],
    impact: 'Audiencia global de más de 3.000 millones de personas.',
    registrationOpen: false,
  },
  {
    id: 'sudam-u23',
    name: 'Sudamericano de Atletismo U23',
    kind: 'Torneo',
    date: '5 – 7 dic 2026',
    place: 'Lima, Perú',
    image: '/images/event-arena.webp',
    about: 'El torneo continental que define becas y lugares en los Panamericanos.',
    attendees: ['valentina'],
    figures: ['Germán Chiaraviglio (invitado)'],
    sponsors: ['Andes Sport', 'Hydra+'],
    howToRegister: 'A través de tu federación nacional antes del 15 de noviembre.',
    requirements: ['Tener entre 18 y 22 años', 'Marca mínima en la prueba', 'Ficha médica al día'],
    impact: 'Transmisión regional y scouting de las principales marcas deportivas.',
    registrationOpen: true,
  },
  {
    id: 'maraton-rosario',
    name: 'Maratón Internacional de Rosario',
    kind: 'Carrera',
    date: '15 nov 2026',
    place: 'Rosario, Argentina',
    image: '/images/event-marathon.webp',
    about: '42K, 21K y 10K por la costanera del Paraná. Abierta a todos los niveles.',
    attendees: ['valentina', 'tomas'],
    figures: ['Joaquín Arbe', 'Florencia Borelli'],
    sponsors: ['Hydra+', 'Pampa Pay'],
    howToRegister: 'Inscripción online con pago de la cuota. Cupos limitados.',
    requirements: ['Apto médico', 'Ser mayor de 18 para el 42K'],
    impact: 'Más de 12.000 corredores y cobertura en TV local.',
    registrationOpen: true,
  },
  {
    id: 'nacional-boxeo',
    name: 'Nacional Juvenil de Boxeo',
    kind: 'Torneo',
    date: '12 – 14 dic 2026',
    place: 'Buenos Aires, Argentina',
    image: '/images/boxer.webp',
    about: 'Define la selección nacional juvenil rumbo a los Panamericanos Junior.',
    attendees: ['camila'],
    figures: ['Federico Moreno (entrenador nacional)'],
    sponsors: ['Golpe Fight Gear'],
    howToRegister: 'Inscripción por club afiliado a la federación.',
    requirements: ['Licencia federativa', 'Ganar el selectivo regional', 'Edad 17 a 21'],
    impact: 'Los campeones ingresan al programa de becas del ENARD.',
    registrationOpen: true,
  },
  {
    id: 'vuelta-sanjuan',
    name: 'Vuelta a San Juan',
    kind: 'Vuelta',
    date: '25 ene – 1 feb 2027',
    place: 'San Juan, Argentina',
    image: '/images/event-cycling.webp',
    about: 'La carrera por etapas más importante de Sudamérica, con equipos del World Tour.',
    attendees: ['tomas'],
    figures: ['Equipos World Tour', 'Eduardo Sepúlveda'],
    sponsors: ['Andes Sport'],
    howToRegister: 'Por equipo continental registrado o selección nacional.',
    requirements: ['Licencia UCI', 'Pertenecer a un equipo inscripto'],
    impact: 'Transmisión internacional en más de 40 países.',
    registrationOpen: false,
  },
]

export const seedDaily: SeedDaily[] = [
  {
    id: 'seed:d1',
    athleteId: 'valentina',
    kind: 'diario',
    body: 'Doble turno hoy: pasadas de 300 a la mañana y gimnasio a la tarde. Las piernas me odian, el cronómetro me ama.',
    image: '/images/runner.webp',
    minutesAgo: 35,
    baseLikes: 214,
    baseComments: [
      { author: 'Tomás Vera', body: 'Esas pasadas a qué ritmo? Vamos que Lima está cerca' },
      { author: 'Camila Sosa', body: 'Fuerza Vale!!' },
    ],
  },
  {
    id: 'seed:d2',
    athleteId: 'camila',
    kind: 'idea',
    body: '¿Alguien más de combate hace natación como recuperación? Estoy probando 20 min después del sparring y llego mucho más fresca al día siguiente.',
    image: '/images/boxer.webp',
    minutesAgo: 120,
    baseLikes: 98,
    baseComments: [{ author: 'Mateo Ibáñez', body: 'Si querés te paso una rutina de recuperación en pileta' }],
  },
  {
    id: 'seed:d3',
    athleteId: 'mateo',
    kind: 'colab',
    body: 'Hoy entrené con @valerios400: ella me enseñó a trabajar zancada y yo le devolví una sesión de técnica de respiración. Disciplinas distintas, mismo hambre.',
    image: '/images/swimmer.webp',
    minutesAgo: 300,
    baseLikes: 431,
    baseComments: [{ author: 'Valentina Ríos', body: 'La próxima vos venís a la pista' }],
  },
  {
    id: 'seed:d4',
    athleteId: 'tomas',
    kind: 'meta',
    body: 'Faltan 98 días para la Vuelta a San Juan. Esta semana: 480 km y dos subidas al Villicum.',
    image: '/images/event-cycling.webp',
    minutesAgo: 600,
    baseLikes: 302,
    baseComments: [],
  },
  {
    id: 'seed:d5',
    athleteId: 'lucas',
    kind: 'diario',
    body: 'Tres horas en el bowl hasta que salió. Primer 540 limpio de mi vida.',
    image: '/images/skater.webp',
    minutesAgo: 1440,
    baseLikes: 1270,
    baseComments: [{ author: 'Camila Sosa', body: 'Qué locura, cuánto lo intentaste?' }],
  },
]

export const seedAthleteKey = (id: string) => `seed:at-${id}`

export function seedAthleteFromKey(key: string) {
  if (!key.startsWith('seed:at-')) return null
  return athletes[key.slice('seed:at-'.length)] ?? null
}

export function companyFromKey(key: string) {
  return companies.find((c) => c.key === key) ?? null
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export function affinityScore(input: { discipline: string; needs: string[] }, company: Pick<Company, 'sports' | 'offers'>) {
  const discipline = normalize(input.discipline)
  const sportMatch = company.sports.includes('*') || company.sports.some((s) => discipline.includes(normalize(s)))
  const overlap = input.needs.filter((n) => company.offers.includes(n)).length
  return Math.min(98, 52 + (sportMatch ? 30 : 0) + overlap * 5)
}

export const MATCH_THRESHOLD = 60
