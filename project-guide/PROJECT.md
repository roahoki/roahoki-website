# Tech Stack Details

- Framework: Next.js 16 (App Router, React 19)
- Lenguaje: TypeScript (strict, alias `@/*` → `src/*`)
- Styling: Tailwind CSS v4 (CSS-first, `@theme` en `src/app/globals.css`)
- UI: componentes propios sobre Radix UI, con los tokens de Shadcn/ui
- i18n: next-intl — locales `es` (default) y `en`
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

**Middleware = `proxy.ts`.** Renombrado en Next 16. El matcher excluye `/api`,
`/admin`, `_next`, `_vercel` y archivos con extensión.

## Entorno

Variables documentadas en `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` saltea RLS:
solo server-side, nunca bajo `NEXT_PUBLIC_`.

## Herramientas

Este repo es 100% personal y está aislado del toolkit organizacional de Buk: el
plugin y su telemetría están desactivados en `.claude/settings.json`. No aplican
convenciones de commits, PR ni narrativa de Buk.
