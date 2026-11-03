import type { Role } from '@/lib/auth-store'

export type LandingPhoto = {
  src: string
  position: string
  caption?: string
  // Autor y licencia (Wikimedia Commons). CC BY / BY-SA exigen citarlos.
  credit?: string
}

const commons = (path: string, caption: string, credit: string, position = 'object-center'): LandingPhoto => ({
  src: `/images/landing/${path}.jpg`,
  position,
  caption,
  credit,
})

export const landingPhotos: Record<Role, LandingPhoto[]> = {
  deportista: [
    commons('athletes/usain-bolt', 'Usain Bolt · Jamaica · Londres 2012', 'Nick Webb · CC BY 2.0'),
    commons('athletes/simone-biles', 'Simone Biles · Estados Unidos · Río 2016', 'Fernando Frazão/Agência Brasil · CC BY 3.0 BR', 'object-[50%_35%]'),
    commons('athletes/ma-long', 'Ma Long · China', 'Xiaoyu Tang · CC BY-SA 2.5', 'object-[40%_30%]'),
    commons('athletes/rebeca-andrade', 'Rebeca Andrade · Brasil · París 2024', 'Ocoudis · CC0', 'object-[50%_30%]'),
    commons('athletes/faith-kipyegon', 'Faith Kipyegon · Kenia', 'Erik van Leeuwen · GFDL', 'object-[50%_30%]'),
    commons('athletes/armand-duplantis', 'Armand Duplantis · Suecia', 'Frankie Fouganthin · CC BY-SA 4.0', 'object-[60%_30%]'),
    commons('athletes/michael-phelps', 'Michael Phelps · Estados Unidos · Río 2016', 'Fernando Frazão/Agência Brasil · CC BY 3.0 BR'),
    commons('athletes/yulimar-rojas', 'Yulimar Rojas · Venezuela', 'Yann Caradec · CC BY-SA 2.0', 'object-[50%_25%]'),
    commons('athletes/judo-paris-2024', 'Judo por equipos · Francia vs. Corea · París 2024', 'Daieuxetdailleurs · CC BY 4.0'),
    { src: '/images/real-athlete.webp', position: 'object-[30%_30%]' },
    { src: '/images/real-athlete-2.webp', position: 'object-[50%_30%]' },
  ],
  empresa: [
    commons('sponsors/coca-cola-paris-2024', 'Coca-Cola · París 2024', 'Simon Pléau · CC BY 4.0'),
    commons('sponsors/samsung-london-2012', 'Samsung · Londres 2012', 'Sludge G · CC BY-SA 2.0'),
    commons('sponsors/molten-fiba', 'Molten · pelota oficial FIBA', 'Verpacker Ing. · Dominio público'),
    commons('sponsors/toyota-paris-2024', 'Toyota · París 2024', 'Kyah117 · CC BY 4.0'),
    commons('sponsors/mikasa-volleyball', 'Mikasa · vóley', 'Sami Mlouhi · CC BY-SA 4.0'),
    commons('sponsors/yonex-badminton', 'Yonex · bádminton', 'Nardisoero · CC BY-SA 4.0'),
    commons('sponsors/wilson-us-open', 'Wilson · US Open', 'Spyro92 · CC BY-SA 4.0'),
    commons('sponsors/asics', 'Asics', 'LeDroider · CC0'),
    { src: '/images/real-sponsor.webp', position: 'object-center' },
    { src: '/images/real-sponsor-2.webp', position: 'object-center' },
    { src: '/images/real-sponsor-3.webp', position: 'object-[50%_40%]' },
  ],
  evento: [
    commons('events/fifa-world-cup-2014', 'FIFA · final del Mundial 2014', 'Danilo Borges/copa2014.gov.br · CC BY 3.0'),
    commons('events/uci-road-worlds-2018', 'UCI · Mundial de Ruta, Innsbruck 2018', 'Granada · CC BY-SA 4.0'),
    commons('events/world-judo-2018', 'IJF · Mundial de Judo, Bakú 2018', 'Rodolfo Vilela/rededoesporte.gov.br · CC BY 3.0 BR'),
    commons('events/vnl-volleyball', 'FIVB · Volleyball Nations League', 'Katarzyna M. Kozłowska · CC BY 2.0'),
    commons('events/european-athletics-2024', 'European Athletics · Roma 2024', 'filip bossuyt · CC BY 2.0'),
    commons('events/panamericanos-2023', 'Panam Sports · Santiago 2023', 'NaBUru38 · CC BY-SA 4.0'),
    commons('events/ittf-worlds', 'ITTF · Mundial de Tenis de Mesa, París 2013', 'Pierre-Yves Beaudouin · CC BY-SA 3.0'),
    commons('events/world-athletics-2023', 'World Athletics · Maratón, Budapest 2023', 'Narnabi · CC BY-SA 4.0'),
    commons('events/fifa-world-cup-2022', 'FIFA · Mundial Qatar 2022', 'Republic of Korea · CC BY-SA 2.0'),
    { src: '/images/real-event.webp', position: 'object-center' },
    { src: '/images/real-event-2.webp', position: 'object-center' },
    { src: '/images/real-event-3.webp', position: 'object-center' },
  ],
}
