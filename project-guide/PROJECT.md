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

**Paleta y tipografía de roahoki como tokens.** La marca (brand book §5.3 y
§5.4) vive en `globals.css`: la paleta en `:root` (`paper`, `ink`, `faded`,
`rule`, `leaf`, `bottle`, nombres en inglés de fondo, texto, atenuado, borde,
acento y botella) y los estilos de texto como utilidades `text-*`
(`text-entry-title`, `text-card-meta`…) que traen tamaño, interlineado, tracking
y peso juntos. `src/lib/brand/palette.ts` repite los hex porque el CSS no puede
importar TypeScript; su test compara ambos y verifica la tabla de contrastes del
brand book. Solo hay paleta clara. Bricolage Grotesque se carga desde
`src/lib/fonts.ts` con el eje `opsz`, así el tamaño óptico lo pone el navegador.
Conviven con los tokens de Shadcn mientras existan páginas con el diseño anterior.

**El logo es código, no imágenes.** `src/components/brand/` tiene la figura
(`LogoMark`, que elige el grosor de trazo según el tamaño, como pide el brand
book) y el logo completo (`Logo`), dibujados con trazos en `currentColor`: toman
el color del texto que los rodea. Los trazos salen de los SVG de la marca y viven
en `paths.ts`. El favicon (`src/app/icon.svg`) es un SVG estático que repite esos
trazos y pasa a crema con el navegador en oscuro; un test avisa si se
desincroniza. El ícono de iOS (`apple-icon.tsx`) se genera con `next/og` porque
iOS no acepta SVG.

**Shadcn sin `components/ui/`.** Se adoptaron los tokens y convenciones, pero los
componentes se escriben a mano sobre Radix en vez de generarse con el CLI. Muchas
dependencias `@radix-ui/*` del `package.json` vienen del scaffold original de v0 y
no todas están en uso.

**Auth del panel.** Comparación directa contra `ADMIN_PASSWORD` y cookie
`httpOnly` validada en el layout del route group `(protected)`. Es deliberadamente
mínimo: un solo usuario, sin tabla de sesiones.

**Middleware = `proxy.ts`, solo para `/admin`.** Renombrado así en Next 16.
Atrapaba todo el sitio para resolver el prefijo de idioma, y cada ruta pública
nueva había que acordarse de excluirla del matcher —un fallo silencioso caro—.
Al quitar next-intl le queda un solo trabajo: inyectar el `x-pathname` que el
layout protegido lee para armar el `?next=` del redirect al login. El matcher
pasó de lista de exclusiones a `/admin/:path*`.

**Un idioma, sin prefijo de ruta.** El sitio se sirve solo en español: no hay
`[locale]`, ni archivos de mensajes, ni selector de idioma. El texto vive en el
JSX de cada componente. Las URLs viejas (`/es/...`, `/en/...`) se redirigen con
301 desde `next.config.ts`.

**Cuatro layouts raíz.** El sitio público vive en el route group `(site)`;
`admin`, `logbook` y `stats` traen el suyo. Son cuatro `<html>` distintos a
propósito: el panel va fijo en oscuro y las páginas públicas respetan el tema
del visitante.

## Entorno

Variables documentadas en `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` saltea RLS:
solo server-side, nunca bajo `NEXT_PUBLIC_`.

## Herramientas

Este repo es 100% personal y está aislado del toolkit organizacional de Buk: el
plugin y su telemetría están desactivados en `.claude/settings.json`. No aplican
convenciones de commits, PR ni narrativa de Buk.
