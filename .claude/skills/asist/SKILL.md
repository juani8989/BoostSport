---
name: asist
description: Pasada de QA de BoostSport por área (deportistas, sponsors, instituciones, admin, acceso). Lanza los agentes qa-* para que recorran la app en el navegador, arreglen los bugs chicos de su área y propongan el resto, y junta un informe único en español. Usar cuando se pida "/asist", "corré los asistentes", "corré el QA", "revisá todas las áreas", "/asist sponsors" o "revisá lo que cambié".
---

# /asist

Coordina a los asistentes de `.claude/agents/asistentes/`: los de QA por área (`qa-*.md`) y el curador de fotos de la portada (`fotos-portada.md`). Las reglas que siguen están en `.claude/asistentes/manual.md`.

## 1. Qué áreas correr

- `/asist` sin nada → **las áreas tocadas por los cambios sin commitear**: mirá `git status --short` y `git diff --name-only`, y asigná cada archivo con el "Mapa de archivos" del manual. Si cambió algo compartido (`components/app/*`, `app-shell.tsx`, `home-feed.tsx`, `search/*`, `match*`, `globals.css`), corré todas las áreas de usuario (deportistas, sponsors, instituciones). Si no hay cambios, corré todas.
- `/asist todo` → las cinco áreas.
- `/asist fotos` → el curador de fotos de la portada (`fotos-portada`). No entra en `/asist` ni en `todo`: corre aparte, una vez por semana o cuando se pida.
- `/asist sponsors deportistas` (o cualquier lista) → solo esas.

Decile al usuario en una línea qué áreas vas a correr y por qué.

## 2. Antes de lanzar

- Comprobá que la app responde: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`. Si no da 200, avisá y pará: no levantes ni reinicies el servidor.
- Comprobá qué cuentas de prueba hay: `grep -c '^QA_.*_EMAIL=.\+' .env.local`. Si falta la de un área, el agente igual corre lo que pueda sin sesión; avisalo.

## 3. Lanzar los agentes

- **De a uno**, en este orden: acceso, deportistas, sponsors, instituciones, admin (y `fotos-portada` si se pidió). Comparten un solo navegador de Playwright y algunos archivos, así que en paralelo se pisarían.
- Usá la herramienta Agent con `subagent_type` igual al nombre del agente (`qa-sponsors`, etc.). En el prompt pasá el foco: los archivos de su área que cambiaron (si los hay) y cualquier pedido puntual del usuario. Recordale que lea `.claude/asistentes/manual.md` primero y que corra `graphify query` antes de buscar en el código.
- Entre agente y agente, contale al usuario en una línea qué encontró y arregló el anterior.

## 4. Informe final (en español)

Juntá los informes en uno solo:

1. **Arreglado:** todo lo que los agentes cambiaron, con `archivo:línea`. Revisá el diff (`git diff`) para confirmar que cada arreglo está y que ningún agente tocó archivos fuera de su área o fuera de alcance; si alguno lo hizo, decilo.
2. **Bugs sin arreglar:** ordenados de más grave a menos.
3. **Propuestas:** agrupadas por área, sin repetir las que aparezcan en dos áreas.
4. **No probado:** lo que quedó afuera y por qué (por ejemplo, falta la cuenta de admin).

Corré `npx tsc --noEmit -p .` al final para confirmar que todo compila. No hagas commit: el usuario decide cuándo.
