# Prompt para v0: aplicar la marca BoostSport

Adjuntá en el chat de v0 estos archivos de `design/logo/` (o el zip `design/v0/boostsport-marca.zip`):
`logo-claro.svg`, `logo-oscuro.svg`, `isotipo-claro.svg`, `isotipo-oscuro.svg`, `favicon.svg`, `explicado-claro.svg`, `explicado-oscuro.svg`.
Después pegá el texto de abajo tal cual.

---

Aplicá la identidad de marca de **BoostSport** a todo el proyecto. No cambies funcionalidades, rutas ni datos: solo marca, colores, tipografía y logo.

**1. Nombre**
- El producto se llama **BoostSport** (B y S mayúsculas). Reemplazá cualquier otro nombre o placeholder.
- Los tres actores son **Atletas**, **Sponsors** e **Instituciones**. Usá "Sponsors" en lugar de "Empresas" en textos visibles.

**2. Logo (archivos adjuntos)**
- Copiá los SVG adjuntos a `/public/brand/` sin modificarlos.
- Header: `logo-oscuro.svg` sobre fondo oscuro y `logo-claro.svg` sobre fondo claro, de unos 32 px de alto.
- Favicon: usá `favicon.svg` como `app/icon.svg` y borrá el favicon anterior.
- Solo el ícono (avatar de la AI, loaders, estados vacíos): `isotipo-claro.svg` / `isotipo-oscuro.svg`.
- Landing o hero: `explicado-oscuro.svg` (triángulo grande con ATLETAS, INSTITUCIONES y SPONSORS en las puntas) como imagen principal, para que se entienda que es un marketplace que conecta a los tres.
- No dibujes anillos olímpicos ni nada que se les parezca. El logo es solo el triángulo.

**3. Tipografía**
- Geist para todo el texto y Geist Mono para etiquetas, números, métricas, badges y eyebrows (en mayúsculas, con letter-spacing de 0.08 em). Cargalas con el paquete `geist` (`geist/font/sans` y `geist/font/mono`) y definilas como `--font-sans` y `--font-mono`.
- Títulos en peso 600 con letter-spacing negativo (−0.02 em); cuerpo en 400.

**4. Colores (tokens en `globals.css`)**
- Base blanco y negro, estilo Vercel:
  - Fondo claro `#FAFAFA`, tarjetas `#FFFFFF`, bordes `#EAEAEA`, texto `#0A0A0A`, texto secundario `#666666`.
  - Fondo oscuro `#0A0A0A`, tarjetas `#111111`, bordes `#2E2E2E`, texto `#EDEDED`, texto secundario `#A1A1A1`.
- Acentos olímpicos, **solo como detalles** (líneas, bordes, barras de progreso, indicadores, el puntaje): azul `#0081C8`, amarillo `#FCB131`, negro/plata `#C8C8C8` (en oscuro), verde `#00A651`, rojo `#EE334E`. Nunca como fondo de grandes superficies ni como color de texto largo.
- **Brillo metálico:** cada acento se usa como degradé con un reflejo al medio. Por ejemplo, azul: `linear-gradient(90deg, #005A8C 0%, #0081C8 35%, #9AD6F5 50%, #0081C8 65%, #005A8C 100%)`. Igual para amarillo (`#B97D08 / #FCB131 / #FFE7A8`), verde (`#006B34 / #00A651 / #9BE6BB`), rojo (`#A3162E / #EE334E / #FFA3B1`) y plata (`#4A4A4A / #C8C8C8 / #FFFFFF`).
- Una línea fina de 2 px con los cinco colores fundidos (azul → amarillo → plata → verde → rojo) debajo del header.

**5. Estilo general**
- Simple y prolijo, con mucho aire: radios de 12–16 px, bordes de 1 px, sombras muy suaves, sin colores saturados de fondo.
- Botón principal negro con texto blanco (en modo oscuro, al revés); botones secundarios con borde de 1 px.
- El puntaje de encaje 0–100 va en una ficha con degradé dorado metálico (`#B97D08 → #FFE7A8 → #FCB131`).
- Todo el texto de la interfaz en castellano rioplatense.

Mostrame el resultado en la landing, en el marketplace y en el perfil del atleta.
