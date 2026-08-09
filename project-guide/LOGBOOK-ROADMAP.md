# Roadmap: el logbook

La tarea grande en curso. El logbook es el primer paso para transformar el
portafolio en la marca personal **roahoki**: notas propias en markdown, con
imágenes, compartibles por link directo (principalmente historias de Instagram).

Cada fila de las tablas es **una PR atómica**. El flujo y las convenciones están
en [`../CLAUDE.md`](../CLAUDE.md); el stack, en [`STACK.md`](STACK.md).

## Qué es y qué no

**Es:** escribir una nota en markdown desde el celular, subirle imágenes,
publicarla, y que el link se vea bien al compartirlo.

**No es (todavía):** borradores con UI propia, video alojado, comentarios,
newsletter, ni quitar next-intl.

## Decisiones tomadas

| Decisión | Elección | Razón |
| --- | --- | --- |
| Base de datos | Supabase Postgres + Drizzle | Esquema versionado y portable a otro Postgres sin costo mensual ni migración |
| Autoría | Editor markdown en `/admin` | Publicar desde el celular; reusa el panel mobile-first |
| Rutas | `/logbook`, fuera de `[locale]` | Links limpios para compartir; nace ya "post-i18n" |
| Tags | Columna `text[]` con índice GIN | Un solo autor: normalizar es prematuro y migrar después es trivial |
| Tests | Vitest + Postgres en Docker | Queries y RLS probadas de verdad, no contra mocks |
| CI | GitHub Actions: lint + tests + build | Atrapa errores de tipo antes de que Vercel los rechace |
| Video | Fuera de alcance | Supabase Storage no transcodifica; se usa YouTube |

**La heurística que guía el diseño:** preferir la opción simple cuando migrar a
la compleja sea barato; invertir en la compleja solo cuando cambiar después sea
caro. Por eso tags como array (barato de migrar) pero esquema versionado desde el
día uno (carísimo de retrofitear).

## Prerequisitos

- [ ] **Docker instalado** — `sudo apt install docker.io docker-compose-v2`.
      Bloquea el bloque 2 en adelante.
- [ ] **Contraseña de la base de datos de Supabase** — Project Settings →
      Database. Bloquea el bloque 3 en adelante.
- [ ] **Rotar credenciales** — pendiente heredado, ver `TODO.md`.

---

## Bloque 1 — Proceso y conocimiento

| # | Rama | Contenido |
| --- | --- | --- |
| 1 | `chore/tooling-and-docs` | Completar la migración a Biome, renombrar el proyecto, documentar el repo |
| 1b | `style/apply-biome-format` | Aplicar `npm run format` sobre los 20 archivos pendientes. Diff mecánico |
| 1c | `fix/lint-a11y-findings` | Los 33 hallazgos que requieren criterio: `noSvgWithoutTitle` (12 iconos), `useButtonType` (5), `noLabelWithoutControl` (4), `noAutofocus`, `noUnusedFunctionParameters`. Los 8 `noNonNullAssertion` se resuelven con un helper tipado de env vars |
| 2 | `docs/stack-reference` | `STACK.md`: la referencia del stack explicada desde Rails |
| 3 | `chore/repo-conventions` | `CLAUDE.md`, plantilla de PR y este roadmap |

> 1b y 1c dependen de la config de Biome que viene en la PR 1: hay que esperar su
> merge, o el linter reporta otra cosa.

## Bloque 2 — Infraestructura de calidad

| # | Rama | Contenido | Tests |
| --- | --- | --- | --- |
| 4 | `chore/test-infra` | Vitest, `docker-compose.test.yml` con Postgres, script `npm test`, workflow de GitHub Actions (lint + tests + `next build`) | Test de humo de la infra |

## Bloque 3 — Reconstruir la capa de datos

Acá está la deuda real del proyecto: **el esquema de la base de datos no vive en
el repo**, sino solo en el dashboard de Supabase, y los tipos están escritos a
mano.

| # | Rama | Contenido | Tests |
| --- | --- | --- | --- |
| 5 | `feat/drizzle-setup` | Drizzle + `drizzle-kit`, `src/db/{schema,index}.ts`, introspección de `testimonials` sin tocarla, `.env.example` con las dos connection strings | Las migraciones aplican limpio |
| 6 | `refactor/testimonials-to-drizzle` | `src/lib/testimonials/queries.ts` y reescritura de los tres puntos de acceso a datos. Elimina `src/lib/supabase.ts`; el tipo se infiere del esquema | Integración de cada query contra Postgres real |
| 7 | `feat/zod-validation` | `src/lib/schemas/` compartido cliente/servidor, en reemplazo de la validación a mano | Unitarios: válidos, inválidos, borde |
| 8 | `refactor/storage-adapter` | `src/lib/storage/` con el tipo `StorageAdapter` y su implementación sobre `supabase-js` | Unitarios contra un adapter fake |
| 9 | `feat/signed-admin-session` | Token HMAC-SHA256 con expiración, en reemplazo de la cookie que hoy guarda `ADMIN_PASSWORD` en claro | Unitarios: firma, verificación, expiración, token manipulado |

## Bloque 4 — Logbook núcleo

| # | Rama | Contenido | Tests |
| --- | --- | --- | --- |
| 10 | `feat/logbook-schema` | Tabla `logbook_entries` + índice GIN + políticas RLS, en una sola migración | Integración: RLS oculta `draft` al rol anónimo |
| 11 | `feat/logbook-slug-and-markdown` | `src/lib/slug.ts` y `src/lib/markdown.tsx` (render sanitizado en Server Component) | Unitarios: slugify y sanitización de HTML malicioso |
| 12 | `feat/logbook-api` | `src/lib/logbook/queries.ts` + route handlers de admin + subida de imágenes vía `StorageAdapter` | Integración de queries; unitarios de validación y autorización |
| 13 | `feat/logbook-editor` | Editor en el panel: `textarea` + preview, sin WYSIWYG. La subida inserta `![](url)` en el cursor. Mobile-first | Unitarios de los helpers; capturas móvil y desktop |
| 14 | `feat/logbook-public-pages` | `/logbook` y `/logbook/[slug]` con ISR, en español y sin next-intl | Capturas; verificación E2E manual |

### Esquema de `logbook_entries`

```sql
id               uuid primary key default gen_random_uuid()
slug             text unique not null      -- la URL pública
title            text not null
summary          text                      -- listado + og:description
body_md          text not null             -- markdown crudo, nunca HTML
cover_image_url  text                      -- preview al compartir
tags             text[] not null default '{}'
status           text not null default 'published'
published_at     timestamptz not null default now()
created_at       timestamptz not null default now()
updated_at       timestamptz not null default now()
```

`status` se crea aunque no haya UI de borradores: cuesta cero ahora y obliga a
revisar todas las queries públicas si se agrega después. Las imágenes viven
embebidas en el markdown; no hay tabla de adjuntos. El porqué de cada columna
está en [`STACK.md` §7](STACK.md#7-diseño-de-datos).

## Bloque 5 — Distribución

Sin este bloque, el link en una historia de Instagram sale como texto pelado.

| # | Rama | Contenido | Tests |
| --- | --- | --- | --- |
| 15 | `feat/logbook-sharing` | `generateMetadata` con Open Graph y Twitter card, más `opengraph-image.tsx` (1200×630): usa la portada o genera una con el título sobre el color de marca | Unitarios del armado de metadata |
| 16 | `feat/logbook-tags` | `/logbook/tag/[tag]` con `arrayContains` y chips en listado y detalle | Integración del filtro; capturas |
| 17 | `feat/logbook-feed` | `feed.xml` y `sitemap.ts` | Unitarios: XML válido y correctamente escapado |

---

## Orden de ejecución

Bloque 1 completo antes de escribir código: **`STACK.md` hay que leerlo y
corregirlo primero**, porque es más barato corregir el entendimiento que el
código.

Luego bloques 2 y 3 (infraestructura y datos), y el 4 hasta poder publicar una
nota real.

**Escribir dos o tres notas de verdad antes del bloque 5.** El uso real va a
cambiar lo que se quiera del editor, y ese feedback conviene que llegue antes de
invertir en pulir la distribución.

## Fuera de alcance

- Quitar next-intl. El logbook se aísla para que esa tanda no lo toque.
- UI de borradores (la columna ya existe).
- Video propio.
- Rate limiting en `POST /api/testimonials` — sigue en `TODO.md`.
- Podar `@radix-ui/*` sin uso; resolver el limbo `components.json` /
  `tailwind.config.ts`; extraer el layout sidebar duplicado en cuatro páginas.
