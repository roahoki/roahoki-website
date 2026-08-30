# Tech Stack Details

- Framework: Next.js 16 (App Router, React 19)
- Lenguaje: TypeScript (strict, alias `@/*` → `src/*`)
- Styling: Tailwind CSS v4 (CSS-first, `@theme` en `src/app/globals.css`)
- UI: componentes propios sobre Radix UI, con los tokens de Shadcn/ui
- Backend: Supabase (Postgres)
- Linter/Formatter: Biome (No ESLint, No Prettier)
- Deploy: Vercel

## Decisiones

**Tailwind v4 sin config JS.** El sistema de diseño vive en `globals.css` con
`@theme inline`. `tailwind.config.ts` quedó como stub vacío heredado de v3 y solo
sigue ahí porque `components.json` lo referencia — no aporta nada.

**Shadcn sin `components/ui/`.** Se adoptaron los tokens y convenciones, pero los
componentes se escriben a mano sobre Radix en vez de generarse con el CLI. Muchas
dependencias `@radix-ui/*` del `package.json` vienen del scaffold original de v0 y
no todas están en uso.

**Auth del panel.** Comparación directa contra `ADMIN_PASSWORD` y cookie
`httpOnly` validada en el layout del route group `(protected)`. Es deliberadamente
mínimo: un solo usuario, sin tabla de sesiones.

**Sin middleware.** `src/proxy.ts` —el middleware, renombrado así en Next 16—
existía solo para el routing de next-intl. Al dejar el sitio en un solo idioma
no queda nada que resolver antes del request, así que el archivo se eliminó en
vez de dejarlo pasando todo de largo.

**Un idioma, sin prefijo de ruta.** El sitio se sirve solo en español: no hay
`[locale]`, ni archivos de mensajes, ni selector de idioma. El texto vive en el
JSX de cada componente. Las URLs viejas (`/es/...`, `/en/...`) se redirigen con
301 desde `next.config.ts`.

**Tres layouts raíz.** El sitio público vive en el route group `(site)`; `admin`
y `logbook` traen el suyo. Son tres `<html>` distintos a propósito: el panel va
fijo en oscuro y las páginas públicas respetan el tema del visitante.

## Entorno

Variables documentadas en `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` saltea RLS:
solo server-side, nunca bajo `NEXT_PUBLIC_`.

## Herramientas

Este repo es 100% personal y está aislado del toolkit organizacional de Buk: el
plugin y su telemetría están desactivados en `.claude/settings.json`. No aplican
convenciones de commits, PR ni narrativa de Buk.
