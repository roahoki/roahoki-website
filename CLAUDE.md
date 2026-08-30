# CLAUDE.md

Sitio personal de Joaquín Peralta (**roahoki**). Next.js 16 + TypeScript +
Tailwind v4, Postgres en Supabase, deploy en Vercel.

Este archivo son **las reglas**. El *por qué* de cada una vive en
[`project-guide/STACK.md`](project-guide/STACK.md) — leerlo antes de tomar
decisiones de arquitectura.

| Documento | Para qué |
| --- | --- |
| [`project-guide/STACK.md`](project-guide/STACK.md) | Cómo funciona el stack y por qué está armado así |
| [`project-guide/PROJECT.md`](project-guide/PROJECT.md) | Decisiones técnicas vigentes |
| [`project-guide/LOGBOOK-ROADMAP.md`](project-guide/LOGBOOK-ROADMAP.md) | La tarea grande en curso, desglosada en PRs |
| [`project-guide/TODO.md`](project-guide/TODO.md) | Pendientes del ciclo actual |
| [`project-guide/BACKLOG.md`](project-guide/BACKLOG.md) | Ideas sin fecha |

---

## Flujo de trabajo

**Una tarea atómica = una rama = una PR = una revisión humana.** No se commitea
directo a `main` ni se acumulan varios cambios en una rama. Ante una tarea
grande, lo primero es proponer el desglose en PRs atómicas.

```bash
git worktree add ../roahoki-<slug> -b <tipo>/<slug> main
cd ../roahoki-<slug> && npm ci        # sí, en cada worktree — ver "Fricciones"
# trabajar; correr lint, tests y build en local
git push -u origin <tipo>/<slug> && gh pr create
# → revisión humana de Joaquín → merge
git worktree remove ../roahoki-<slug>
```

Prefijos de rama: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `style/`.
Los worktrees son hermanos del repo, en `/home/joaquinperalta/roahoki-projects/`.

**La descripción de cada PR lleva las cinco secciones** de
`.github/PULL_REQUEST_TEMPLATE.md`, sin excepción: descripción del problema, mapa
mental de producto, mapa mental técnico, valor que aporta, y cómo probarlo. Si
hay cambios de UI, capturas antes/después — incluyendo móvil, porque el panel es
mobile-first.

**Toda PR con código lleva sus tests.** Las de documentación pura son la única
excepción.

## Convenciones de código

- **Todo el código en inglés**: identificadores, funciones, tipos, nombres de
  archivo, tablas, columnas y ramas.
- **Comentarios en español**, breves. Se comenta el *porqué*, no el *qué*. Es
  válido dejar `TODO:` y explicar decisiones de diseño cuando la razón no sea
  evidente leyendo el código.
- **Strings visibles al usuario en español** — son contenido, no código.
- **Commits y descripciones de PR en español**, con prefijo convencional
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`).

## Datos

- **Todo acceso a datos pasa por Drizzle.** `supabase-js` queda confinado a
  `src/lib/storage/`; no se usa para consultar tablas.
- **Nunca queries inline en componentes o route handlers.** Van en
  `src/lib/<dominio>/queries.ts` y desde ahí se importan.
- **Los tipos se derivan del esquema** (`$inferSelect` / `$inferInsert`), nunca se
  escriben a mano.
- **Cambios de esquema solo por migración generada con `drizzle-kit` y
  commiteada.** Nunca editar tablas a mano en el dashboard de Supabase: el repo
  es la fuente de verdad del esquema.
- **Toda tabla nueva nace con sus políticas RLS en la misma migración que la
  crea.** Sin RLS queda abierta a internet; con RLS y sin políticas queda
  cerrada. Nunca es lo correcto por defecto.

> Drizzle conecta por Postgres directo y **se salta RLS**. La validación
> server-side es la barrera principal; RLS es la red de seguridad para lo que
> siga usando la anon key desde el browser. Detalle en `STACK.md` §4.3.

## Validación

- **zod para todo input externo.** Los esquemas viven en `src/lib/schemas/` y se
  comparten entre el formulario y el route handler — una sola definición.
- Nunca validar a mano con `if` encadenados en un route handler.

## Render

- **Server Components por defecto.** `"use client"` solo cuando hay interacción
  real (estado, eventos, hooks del browser), y lo más abajo posible en el árbol.
- Los datos se consultan en el servidor y se pasan como props a los componentes
  de cliente.
- Páginas públicas con contenido de la DB: ISR (`export const revalidate`), no
  render dinámico.

## UI y estilos

- **Componentes propios sobre Radix**, con los tokens de `src/app/globals.css`.
  No hay `src/components/ui/` generado por el CLI de shadcn y no se va a agregar.
- **No instalar librerías de UI nuevas** sin discutirlo antes.
- Tailwind v4, CSS-first: el sistema de diseño está en `@theme inline` dentro de
  `globals.css`. No hay config JS (`tailwind.config.ts` es un stub heredado).
- **Biome** para lint y formato. No ESLint, no Prettier.

## Rutas

- **El sitio es solo en español y sin prefijo de idioma.** Las rutas son
  literales (`/projects`, `/logbook`). No se reintroduce i18n.
- **Cada raíz del árbol trae su propio layout**: `(site)` para el sitio público,
  `admin` para el panel y `logbook` para las notas. No hay `src/app/layout.tsx`
  porque el panel va fijo en oscuro y lo público sigue el tema del visitante.
- **No hay middleware.** `src/proxy.ts` existía solo para el routing de idiomas.
  El panel se protege en su layout, no en un matcher.

## Seguridad

- **`NEXT_PUBLIC_` publica la variable en el bundle del browser.** Ninguna clave
  secreta puede llevar ese prefijo.
- `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` son solo server-side.
- El panel `/admin` se protege en `src/app/admin/(protected)/layout.tsx`. Todo lo
  que deba estar protegido va dentro de ese route group; no se repite el chequeo
  por página.

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción (verifica tipos)
npm run lint     # Biome
npm run format   # Biome con --write
npm test         # Vitest
```

## Fricciones conocidas

- **Cada worktree necesita su propio `npm ci`.** Un symlink a `node_modules` no
  sirve: Turbopack falla con `Symlink [project]/node_modules is invalid, it
  points out of the filesystem root`.
- **Host de imágenes nuevo = agregarlo a `remotePatterns` en `next.config.ts`**, o
  `next/image` falla en runtime. Esa lista es un allowlist de seguridad.
- **El transaction pooler de Supabase (puerto 6543) exige `prepare: false`** en el
  driver postgres.js. Sin eso las queries fallan de forma confusa.
- **Video:** Supabase Storage no transcodifica ni hace streaming adaptativo, y un
  MP4 de celular supera el límite de request de Vercel. Para video se usa
  `src/components/youtube-embed.tsx`.
