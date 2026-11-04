import type { Role } from '@/lib/auth-store'

export type LandingPhoto = {
  src: string
  /** 800 px for phones, 1280 px for larger screens; the browser downloads only one. */
  srcSet: string
  position: string
  caption?: string
  // Autor y licencia (Wikimedia Commons). CC BY / BY-SA exigen citarlos.
  credit?: string
}

const sized = (stem: string) => ({ src: `${stem}-1280.webp`, srcSet: `${stem}-800.webp 800w, ${stem}-1280.webp 1280w` })

const commons = (path: string, caption: string, credit: string, position = 'object-center'): LandingPhoto => ({
  ...sized(`/images/landing/${path}`),
  position,
  caption,
  credit,
})

const own = (name: string, position = 'object-center'): LandingPhoto => ({ ...sized(`/images/${name}`), position })

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
    own('real-athlete', 'object-[30%_30%]'),
    own('real-athlete-2', 'object-[50%_30%]'),
  ],
  empresa: [
    commons('sponsors/puma-bolt-rio-2016', 'Puma · Usain Bolt, final de 100 m · Río 2016', 'Fernando Frazão/Agência Brasil · CC BY 3.0 BR', 'object-[50%_14%]'),
    commons('sponsors/nike-babolat-nadal-rio-2016', 'Nike y Babolat · Rafael Nadal · Río 2016', 'Agência Brasil · CC BY 2.0', 'object-[60%_35%]'),
    commons('sponsors/omega-lillehammer-2016', 'Omega · cronometrador oficial · Lillehammer 2016', 'Lillehammer 2016 Youth Olympic Games · CC BY 2.0', 'object-[50%_40%]'),
    commons('sponsors/nike-neymar-rio-2016', 'Nike · Neymar, oro en fútbol · Río 2016', 'Agência Brasília · CC BY 2.0', 'object-[70%_35%]'),
    commons('sponsors/mikasa-volei-rio-2016', 'Mikasa · pelota oficial · Brasil vs. Francia, Río 2016', 'Fernando Frazão/Agência Brasil · CC BY 3.0 BR', 'object-[88%_62%]'),
    commons('sponsors/nike-del-potro-rio-2016', 'Nike · Juan Martín del Potro, plata · Río 2016', 'Catherine Salaün · CC BY-SA 2.0', 'object-[50%_30%]'),
    commons('sponsors/speedo-phelps-dressel-rio-2016', 'Speedo · Phelps y Dressel, relevo 4×100 · Río 2016', 'Fernando Frazão/Agência Brasil · CC BY 3.0 BR', 'object-[60%_48%]'),
    commons('sponsors/nike-asics-maraton-rio-2016', 'Nike y Asics · maratón masculina · Río 2016', 'Pedro Perim · CC BY-SA 4.0', 'object-[60%_70%]'),
    commons('sponsors/adidas-final-mundial-2014', 'adidas · final del Mundial 2014, Argentina vs. Alemania', 'Agência Brasil · CC BY 3.0 BR', 'object-[50%_55%]'),
    commons('sponsors/uniqlo-head-djokovic-rio-2016', 'Uniqlo y Head · Novak Djokovic · Río 2016', 'Agência Brasil · CC BY 3.0 BR', 'object-[35%_45%]'),
    commons('sponsors/mikasa-volei-praia-rio', 'Mikasa · vóley playa en Copacabana · evento de prueba Río 2016', 'Tânia Rêgo/Agência Brasil · CC BY 3.0 BR', 'object-[50%_8%]'),
    commons('sponsors/sponsors-neymar-mundial-2014', 'Visa, Sony, Coca-Cola y adidas · conferencia de la selección · Mundial 2014', 'Danilo Borges/copa2014.gov.br · CC BY 3.0', 'object-[30%_30%]'),
    commons('sponsors/omega-milano-cortina-2026', 'Omega · cuenta regresiva · Milano Cortina 2026', 'Dobroš · CC BY-SA 4.0', 'object-[75%_50%]'),
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
    own('real-event'),
    own('real-event-2'),
    own('real-event-3'),
  ],
}
