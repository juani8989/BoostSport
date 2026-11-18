# Manual de los asistentes de BoostSport

Lo leen todos los asistentes (`.claude/agents/asistentes/`) antes de empezar. Junta lo que se sabe del producto, del código, de las decisiones tomadas con Juani y de cómo trabajar. Si algo de acá choca con lo que ves en el código, gana el código: avisalo en el informe para corregir el manual.

---

## 1. Qué es BoostSport

Un marketplace que conecta **deportistas** que buscan sponsor con **marcas (sponsors)** e **instituciones** (eventos, torneos, clubes, federaciones). Estética olímpica (anillos, cinco colores), tono argentino, pensado primero para el celular.

**Los tres roles y el invitado:**

| Rol | Qué hace en la app |
|---|---|
| **Deportista** | Publica su día (Compañeros), sube logros a la Vitrina, arma su perfil (trayectoria, menciones en prensa, metas, necesidades), hace Match con marcas y eventos, se postula a desafíos. |
| **Sponsor (empresa)** | Busca deportistas que representen la marca: Inicio (Deportistas ⇄ Vitrina, Eventos), Scout con IA, Buscar e invitar, Match, tienda de productos en su perfil. |
| **Institución (evento)** | Suma deportistas y marcas a su evento: Inicio (Deportistas ⇄ Vitrina, Marcas), propuestas de contrato a marcas, Buscar e invitar, Match. |
| **Invitado** | Mira Inicio y la lupa sin cuenta; cualquier acción le pide crear cuenta. |
| **Administrador** | Panel aparte: métricas, listas por rol, ficha y edición de usuarios, recordatorios de perfil. |

**Decisiones de negocio (nov. 2026):**
- Pagan marcas e instituciones (planes de acceso: publicidad, invitaciones, difusión). Los atletas son gratis y la idea es que también ganen (retos pagados, donaciones, contenido exclusivo) con un % para BoostSport.
- Inscripción a eventos con cargo por servicio **visible** (5–12 %), nunca escondido.
- Lanzamiento: **beta cerrada y gratis** con atletas amigos del Comité Olímpico Argentino, antes de cobrar nada. La prioridad es lanzar; los cobros van por detrás.
- Preocupación abierta: verificar que las marcas y los eventos sean reales (no cuentas fantasma).

---

## 2. Mapa de la app

**Navegación:** en celular, encabezado (logo triangular que recarga la página, notificaciones, menú) y barra de abajo (Inicio, Buscar, Match, Mensajes, tu foto con tu apodo). En compu, barra lateral de íconos con el mismo contenido. **Tocar una sección cierra cualquier panel abierto** (notificaciones, configuración, perfil, chat) y solo hay un panel a la vez.

**Inicio (`home-feed.tsx`)**, feed de pantalla completa con botones arriba:
- Deportista: **Compañeros ⇄ Vitrina** (el mismo botón; un segundo toque cambia), Sponsors, Eventos.
- Sponsor: **Deportistas ⇄ Vitrina**, Eventos.
- Institución: **Deportistas ⇄ Vitrina** (lista con buscador), Marcas.
- Invitado: Compañeros ⇄ Vitrina, Eventos.
- La primera vez aparece el cartelito "Tocá de nuevo para ver la Vitrina". Deslizar hacia abajo recarga; en compu hay flechas para pasar de post.
- **Sponsors y Eventos** muestran primero las **cuentas reales** (ordenadas por afinidad con el atleta) y después los ejemplos del catálogo.

**Vitrina:** logros reales que suben los atletas (medallas y marcas personales, con "Cargado por …") primero, y después las tarjetas de ejemplo (medallas verificadas, estadísticas, Top Secret). El atleta suma logros con el **+ rojo** o desde Perfil → + → "Logro para la Vitrina", y los saca desde Perfil → Logros.

**Lupa (`search-panel.tsx`):** busca usuarios, contenido, torneos y referencias (notas de prensa del perfil). Sin texto muestra historial (en el dispositivo), búsquedas recomendadas, "Podría interesarte", publicaciones más populares y torneos; en compu, "Podría interesarte" y "Más populares" van en una columna a la derecha. Sponsors reales y de ejemplo abren su propia página; deportistas, su perfil.

**Match (`match-deck.tsx`):** tarjetas para deslizar (me interesa / paso) con afinidad. La afinidad con cuentas reales se calcula con lo que la organización escribió en su perfil (`orgAffinity` en `lib/catalog.ts`, entiende familias como "deportes de combate").

**Perfil:** del atleta (`athlete-profile.tsx`: Publicaciones, Menciones, Metas, Logros, Mis datos, Guardados) y de la organización (`org-profile.tsx`: datos, tienda, Scout con IA, Buscar e invitar).

**Acciones con animación (`components/app/action-fx.tsx`):** like, apoyar (con frase motivadora), guardar, comentar, compartir, reportar, seguir, "Quiero ir"; contadores que ruedan; vibración en Android; doble toque = like, doble toque sostenido = apoyar.

**Portada "¿Quién sos?" (`components/auth/who-am-i.tsx`):** tres paneles (Atleta, Sponsor, Institución) con foto de fondo al pasar; la foto de cada rol **rota sola cada día a las 06:00 de Argentina** (`photoOfTheDay` en `lib/landing-photos.ts`). La cuida el asistente `fotos-portada`.

**Fuera de alcance de los asistentes:** mensajes y contratos (`components/messages/*`, `components/event/contract-sheet.tsx`, `components/proposal-sheet.tsx`) se trabajan en otra conversación.

---

## 3. Cómo está hecho

- **Next.js 16.4 (Turbopack)**, React 19, Tailwind 4, `tw-animate-css`, íconos `lucide-react`. Esta versión de Next tiene cambios: antes de usar una API de Next, leé la guía en `node_modules/next/dist/docs/` (lo pide `AGENTS.md`).
- **Base:** Postgres en Supabase con Drizzle (`lib/db/schema.ts`). Los perfiles viven en `profiles.data` (JSONB): `AthleteProfile` u `OrgProfile` (`lib/profile-types.ts`). Los logros de la Vitrina están en `AthleteProfile.vitrina`.
- **Autenticación:** better-auth con mail y contraseña y **verificación de mail obligatoria** (`lib/auth.ts`). No se toca.
- **Lecturas:** pasan por `/api/data` (`lib/data-fns.ts` lista las funciones permitidas) con SWR (`load('nombre', ...args)`), para que corran en paralelo. **Escrituras:** server actions en `app/actions/*`. Si agregás una lectura nueva, sumala a `data-fns.ts`.
- **Archivos:** fotos y audios en Vercel Blob (`lib/upload.ts`, `storeMedia`); si Blob no está configurado, quedan como data URL.
- **Datos de ejemplo:** `lib/data.ts` (atletas de ejemplo, Vitrina de ejemplo) y `lib/catalog.ts` (marcas, eventos, posts de Compañeros de ejemplo). Conviven con los datos reales; las claves son `seed:at-…`, `seed:co-…` y `user:<id>`.
- **Scout con IA:** usa el AI SDK con el gateway de Vercel; sin `AI_GATEWAY_API_KEY` cae a un filtro por palabras clave.
- **Despliegue:** cada merge a `main` **se despliega solo** (Vercel, proyecto enlazado a v0).

**Convenciones:**
- Textos de la interfaz en **español rioplatense** (vos, tocá, ingresá); comentarios del código y mensajes de commit en **inglés**, como el historial ("Make Match smooth: …").
- Componentes compartidos: `components/app/kit.tsx` (`Sheet`, `PartyAvatar` con caída a iniciales si la foto falla, `FeedSkeleton`, `compressImage`), `components/feed/slide.tsx` (`Slide`, `AthleteTag`, `Chip`).
- Colores: `olympic-blue`, `olympic-yellow`, `olympic-green`, `olympic-red`, `olympic-black`, `olympic-white`. Rol → color: deportista azul, sponsor amarillo, institución verde, invitado rojo.
- Logo del encabezado: solo el triángulo de colores, sin fondo (`BrandWordmark` / `RefreshLogo` en `brand-logo.tsx`); tocarlo recarga la página.
- El perfil se muestra con la foto y el apodo (o el primer nombre); no se muestra la etiqueta del rol en el encabezado.
- Ramas `feat/<tema>` con PR a `main`; nunca commits directos a `main`.

---

## 4. Áreas y archivos

Cada asistente **edita solo los archivos de su área**. Los compartidos se proponen, no se tocan, para no pisarse.

| Asistente | Quién | Archivos que puede editar |
|---|---|---|
| `qa-deportistas` | Deportista | `components/home/companeros-feed.tsx`, `components/feed/vitrina-feed.tsx`, `components/feed/slide.tsx`, `components/profile/athlete-profile.tsx`, `create-menu.tsx`, `logro-sheet.tsx`, `press-mentions.tsx`, `components/posts/*`, `components/saved/*`, `app/actions/athlete.ts`, `posts.ts`, `vitrina.ts`, `social.ts` |
| `qa-sponsors` | Sponsor | `components/profile/org-profile.tsx`, `org-profile-form.tsx`, `components/home/empresas-feed.tsx`, `real-org.tsx`, `apply-sheet.tsx`, `components/org/*`, `app/actions/org.ts`, `orgs.ts` |
| `qa-instituciones` | Institución | `components/event/event-athletes-feed.tsx`, `event-brands-feed.tsx`, `components/home/eventos-feed.tsx` (y lo de evento en `org-profile*.tsx`, coordinando con sponsors) |
| `qa-admin` | Administrador | `components/admin/*`, `app/actions/admin.ts`, `lib/admin*.ts` |
| `qa-acceso` | Persona nueva o invitada | `components/auth/*` (salvo `who-am-i.tsx` en lo que hace a fotos), `components/onboarding/*`, `components/root-gate.tsx`, `app/actions/register.ts`, `profile.ts` |
| `fotos-portada` | Curador de fotos | `lib/landing-photos.ts`, `public/images/landing/**` |

- **Compartidos (solo proponer):** `components/app-shell.tsx`, `components/app/*`, `components/home/home-feed.tsx`, `components/search/*`, `components/match/match-deck.tsx`, `app/actions/match.ts`, `search.ts`, `components/settings/*`, `components/notifications.tsx`, `app/globals.css`, `lib/*` (salvo los de tu área).
- **Fuera de alcance (no tocar):** mensajes y contratos, `lib/auth.ts`, `next.config.mjs`, `.env*`, `lib/db/*` y scripts que escriben en la base.

---

## 5. Antes de leer código

Hay un grafo de conocimiento en `graphify-out/`. Antes del primer grep o lectura, corré `graphify query "<pregunta>"`; para relaciones, `graphify path "<A>" "<B>"`; para un concepto, `graphify explain "<concepto>"`. Leé archivos crudos solo en las líneas que el grafo ya ubicó. Después de modificar código, `graphify update .` (el `graph.json` se reescribe entero: un diff grande ahí es normal).

---

## 6. Cómo probar

- **Servidor:** la app corre en `http://localhost:3000` (`corepack pnpm dev`, a veces de otra sesión). Si no responde, avisá; no lo levantes, reinicies ni mates procesos. Solo responde en `localhost` (no en `127.0.0.1`).
- **Navegador:** Playwright (`mcp__plugin_playwright_playwright__*`). Tiene su propia sesión: no cierra las sesiones que Juani tiene abiertas en su Chrome ni en el panel de la app. No uses Chrome ni el panel. Probá en **celular (375×812)** y **compu (1280×800)**.
- **Cuentas de prueba** en `.env.local`: `QA_DEPORTISTA_*`, `QA_SPONSOR_*`, `QA_INSTITUCION_*`, `QA_ADMIN_*` (`_EMAIL` y `_PASSWORD`). Leelas con `grep '^QA_' .env.local`; no las copies a ningún archivo, informe ni commit. Las de sponsor (Combate Pro, deportes de combate) e institución (Carrera Costanera Rosario) son de prueba; la de admin y la de deportista pueden ser de Juani: usalas con cuidado y no cambies nada de esas cuentas.
- **Iniciar sesión:** en "¿Quién sos?" elegí el rol, completá mail y contraseña, Ingresar. Si el navegador autocompleta otra cuenta, borrá el campo antes de escribir. **Cerrar sesión:** `fetch('/api/auth/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })`.
- **Errores:** consola del navegador y `tail -n 300 .next/dev/logs/next-development.log | grep ERROR`. "Changed size between renders" o "module factory is not available" justo después de editar suelen ser de la recarga en caliente: recargá la página y volvé a mirar. Si persiste "module factory is not available", buscá un **import circular** (dos componentes que se importan entre sí): ya pasó.
- **Simular gestos:** el deslizar para recargar se prueba con `TouchEvent` (`touchstart`/`touchmove`/`touchend`) sobre el contenedor `.snap-y`.

---

## 7. Qué buscar

1. **Bugs:** algo que no anda, se rompe, muestra datos equivocados o tira error en consola.
2. **Cosas del rol equivocado:** textos, botones o listas pensados para otro rol ("Compañeros" para una marca, "Quiero ir" donde no corresponde).
3. **Coherencia:** el mismo dato (nombre, iniciales, foto, afinidad, contadores, fechas) igual en todas las pantallas.
4. **Celular y compu:** nada tapado, cortado ni encimado; nada fuera de la pantalla; botones al alcance del pulgar.
5. **Textos:** español rioplatense, sin tipeos, sin textos de prueba ni en inglés; fechas legibles ("5 de diciembre de 2026", no "2026-12-05").
6. **Vacíos, cargas y errores:** qué se ve sin datos, mientras carga (siluetas, no saltos) y si falla.
7. **Datos reales y de ejemplo juntos:** que las cuentas reales aparezcan donde aparecen los ejemplos, primero y con la afinidad bien calculada.

---

## 8. Arreglar o proponer

**Arreglá en el momento** si se cumplen todas: es un bug claro (no un cambio de diseño o de producto), se arregla en pocas líneas, está en archivos de **tu área** y no toca nada fuera de alcance. Después: `npx tsc --noEmit -p .` sin errores, volvé a probarlo en el navegador y `graphify update .`.

**Proponé** (sin tocar) todo lo demás: diseño, funciones nuevas, archivos compartidos o de otra área, arreglos grandes. Qué cambiarías, dónde y por qué.

---

## 9. Lo que nunca hacés

- Commit, push, merge ni deploy (cada merge a `main` se publica).
- Crear o borrar cuentas, ni correr scripts contra la base.
- Mandar postulaciones, mensajes, invitaciones, propuestas o mails (el botón "Probar envío de mails" del admin manda uno real). Likes, apoyos, guardados, seguidos y logros de prueba se deshacen al terminar.
- Iniciar sesión con Google ni con cuentas que no sean las de prueba.
- Cambiar autenticación, `next.config.mjs` o `.env*`; reiniciar el servidor.
- Dejar archivos sueltos en el repo (las capturas de Playwright van a `.playwright-mcp/`, que está ignorada; borrala igual al terminar).

---

## 10. Skills: cuáles usa cada asistente

Las skills se invocan con la herramienta Skill. Esta es la lista completa de las que hay en el entorno y cuándo sirven acá.

**Para todos los asistentes**

| Skill | Cuándo |
|---|---|
| `graphify` | Siempre, antes de buscar en el código (sección 5). |
| `superpowers:systematic-debugging` | Ante cualquier bug: reproducir, aislar la causa, recién ahí arreglar. |
| `superpowers:verification-before-completion` | Antes de poner algo en "Arreglado": probarlo de verdad. |
| `superpowers:test-driven-development` | Si un arreglo toca lógica (cálculos, filtros, fechas): escribir primero el caso que falla. |
| `code-review` | Al terminar, sobre tu propio diff (nivel `low`). |
| `simplify` | Si tu arreglo quedó enredado, para limpiarlo antes del informe. |
| `context7-mcp` | Para dudas de librerías (Next, React, Drizzle, better-auth, SWR, Tailwind). |
| `run` / `anthropic-skills:built-in-browser` | Referencia de cómo levantar y manejar la app y el navegador (respetando la sección 6). |
| `design:ux-copy` | Para revisar y proponer textos de la interfaz. |
| `general:write-text` | Para que los textos que proponés suenen naturales, no a IA. |
| `design:accessibility-review` | Contraste, tamaños de toque, etiquetas para lectores de pantalla. |

**Por área**

| Asistente | Skills propias |
|---|---|
| `qa-deportistas` | `design:design-critique` (feed, Vitrina, perfil), `frontend-design:frontend-design` (al proponer pantallas), `dataviz` (estadísticas y gráficos de la Vitrina), `design:user-research` (para fundamentar propuestas con lo que hace un atleta). |
| `qa-sponsors` | `design:design-critique` (tarjetas y páginas de marca), `marketing:brand-review` (que la página de una marca la represente bien), `claude-api` (si hay que revisar Scout con IA), `frontend-design:frontend-design`. |
| `qa-instituciones` | `design:design-critique`, `frontend-design:frontend-design`, `design:design-handoff` (al proponer cambios para que otro los implemente). |
| `qa-admin` | `supabase:supabase` y `supabase:supabase-postgres-best-practices` (solo para leer y diagnosticar, nunca escribir), `data:sql-queries` y `data:validate-data` (contadores y métricas del resumen), `dataviz` (el gráfico de registros), `security-review` (permisos del panel). |
| `qa-acceso` | `security-review` (registro, login, verificación de mail, invitado), `design:accessibility-review`, `design:ux-copy` (errores y pasos del registro). |
| `fotos-portada` | `anthropic-skills:deep-research` y el agente `web-fetch` (buscar fotos y verificar licencias en Commons), `frontend-design:frontend-design` (encuadre). |
| Coordinación (`/asist`) | `asist`, `superpowers:dispatching-parallel-agents` (si alguna vez se corren en paralelo), `superpowers:requesting-code-review`, `superpowers:finishing-a-development-branch` y `superpowers:using-git-worktrees` (cuando Juani pida commitear o trabajar en ramas). |

**Skills que hay en el entorno pero no corresponden a estos asistentes** (no las uses salvo que Juani lo pida): `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`, `superpowers:subagent-driven-development`, `superpowers:receiving-code-review`, `superpowers:writing-skills`, `superpowers:diagnosing-superpowers`, `superpowers:using-superpowers` (proceso general, ya cubierto por este manual); `design:design-system`, `design:research-synthesis` (sistema de diseño e investigación de usuarios, son trabajo aparte); `artifact-design`, `artifact-diagramming`, `artifact-capabilities` (páginas publicadas en claude.ai); `diseno-producto:*`, `ecloud-cuentas:*`, `general:documento` (procesos de ecloud con clientes); `data:analyze`, `data:build-dashboard`, `data:create-viz`, `data:data-context-extractor`, `data:data-visualization`, `data:explore-data`, `data:statistical-analysis`, `data:write-query` (análisis de datos, fuera de QA); `marketing:*` salvo `brand-review`, `finance:*`, `small-business:*`, `productivity:*`, `slack-by-salesforce:*`, `cowork-plugin-management:*` (negocio y productividad); `anthropic-skills:docx`, `pdf`, `pptx`, `xlsx`, `docs`, `google-workspace`, `chrome-browser`, `computer-use`, `charlame`, `morning`, `explain-usage`, `import-memory`, `consolidate-memory`, `setup-claude`, `skill-creator`; `workflow-authoring`, `plugin-authoring`, `update-config`, `keybindings-help`, `fewer-permission-prompts`, `loop`, `schedule`, `init` (configuración de Claude Code).

---

## 11. Rutinas

Cada asistente tiene su rutina en su archivo. Cuándo correrlos:

| Cuándo | Qué correr |
|---|---|
| Después de cambiar algo de un área | `/asist` (corre solo las áreas tocadas) |
| Antes de commitear o abrir un PR | `/asist` y revisar el informe |
| Una vez por semana | `/asist todo` |
| Una vez por semana (o cuando haya fotos nuevas) | `fotos-portada` (`/asist fotos`) |
| Antes de mostrar la app al grupo del COA | `/asist todo` con foco en celular |

---

## 12. Pendientes conocidos

Para no reportarlos de nuevo como nuevos (sí, si cambiaron o encontrás algo más):

- **Afinidad (`orgAffinity`, `lib/catalog.ts`):** compara pedazos de palabra ("extremos" cuenta como remo, "Agua Pura" como natación, "carrera profesional" como running, "Europa" como ropa); no entiende plurales y femeninos ("acuáticas"). Propuesta: comparar palabras enteras.
- **Match (`app/actions/match.ts`):** a una marca se le muestra un porcentaje y el match con deportistas de ejemplo se decide con otro; una marca sin perfil ve a los reales al 45 %.
- **Listas sin orden por afinidad:** "Buscar e invitar" de sponsor y evento, "Deportistas" y "Marcas" de la institución.
- **Iniciales distintas** para la misma cuenta ("CO" en el perfil, "CP" en el resto, "C" en las barras).
- **Productos sin foto** se ven como tarjetas blancas en el perfil de la marca.
- **Login:** el error "Ingresá un email válido" no se va al corregir el mail.
- **Admin:** el gráfico de registros sale vacío aunque haya altas; nombres sin mayúscula ("ricardo Mayoraz").
- **Logos con archivo inexistente** en algunas cuentas (por ejemplo `/images/orgs/copa-rosario-logo.png`): se ven bien porque caen a las iniciales, pero hay que corregir el dato.
- **Desafíos vencidos** que siguen como abiertos ("10K en tu ciudad", de Andes Sport).
- **Lupa:** mientras carga una búsqueda nueva, muestra un instante "No encontramos nada" de la anterior.
- **Invitado:** no tiene la sección Sponsors en Inicio.
- **Una marca no puede proponer sponsoreo** desde la página de un evento real.
- **Scout con IA:** sin `AI_GATEWAY_API_KEY` en local solo anda el filtro por palabras clave.
- **Fotos de sponsors:** no hay foto libre con Gatorade o Powerade y la marca legible (opciones: licencia paga o fotos propias).

---

## 13. Informe (en español)

Corto y concreto, con este formato:

```
## <Área> — QA del <fecha>

### Arreglado
- <qué estaba mal> → <qué cambiaste> (`archivo:línea`). Probado en celu/compu.

### Bugs sin arreglar
- <qué pasa, cómo reproducirlo, dónde está> — por qué no lo arreglaste.

### Propuestas
- <cambio> — <por qué> — archivos.

### No probado
- <qué quedó afuera y por qué>.
```

Si encontraste algo que contradice este manual, agregá al final **"Para corregir en el manual"**.
