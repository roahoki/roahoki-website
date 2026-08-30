# roahoki-website

Sitio personal de Joaquín Peralta: portafolio bilingüe (es/en) con secciones de
experiencia, proyectos y docencia, más un sistema de testimonios con panel de
administración.

## Stack

| Capa | Elección |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 (CSS-first, `@theme`) |
| UI | Componentes propios sobre Radix UI, con tokens de shadcn/ui |
| Backend | Supabase (Postgres) |
| Lint/Format | Biome (sin ESLint, sin Prettier) |
| Deploy | Vercel |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar credenciales
npm run dev                  # http://localhost:3000
```

Las variables de entorno están documentadas en `.env.example`: URL y claves de
Supabase, y `ADMIN_PASSWORD` para el panel. `SUPABASE_SERVICE_ROLE_KEY` es
privilegiada — solo server-side, nunca con prefijo `NEXT_PUBLIC_`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | Lint con Biome |
| `npm run format` | Formatea con Biome |

## Estructura

```
src/
├── app/
│   ├── (site)/            Sitio público
│   │   ├── page.tsx        Landing (hero, stack, experiencia, testimonios)
│   │   ├── experience/
│   │   ├── projects/
│   │   ├── teaching/
│   │   └── testimonials/new/   Formulario público de testimonios
│   ├── logbook/           Notas públicas, con ISR
│   ├── stats/             Contadores de la semana, con ISR
│   ├── admin/             Panel privado
│   │   ├── login/
│   │   └── (protected)/    Dashboard y moderación de testimonios
│   └── api/
│       ├── testimonials/           POST público del formulario
│       └── admin/{login,logout,testimonials}
├── components/            UI compartida + icons/ (logos de experiencia)
├── db/                    Esquema y conexión de Drizzle
└── lib/                   Queries por dominio, schemas de zod, storage, auth

project-guide/             Notas de trabajo: PROJECT, TODO, BACKLOG
```

### Notas de arquitectura

**Un solo idioma.** El sitio se sirve en español y las rutas no llevan prefijo.
No hay archivo de mensajes: el texto vive en el JSX. Las URLs viejas con prefijo
(`/es/...`, `/en/...`) se redirigen con 301 desde `next.config.ts`.

**Middleware.** En Next.js 16 el archivo pasó a llamarse `proxy.ts`. Su matcher
es `/admin/:path*` y nada más: le inyecta el `x-pathname` al request para que el
layout protegido pueda armar el `?next=` del redirect al login. Las rutas
públicas no pasan por él.

**Cuatro layouts raíz.** `(site)`, `admin`, `logbook` y `stats` traen cada uno su
`<html>`: el panel va fijo en oscuro y las páginas públicas respetan el tema del
visitante.

**Rutas públicas vs. privadas.** El panel cuelga de `/admin`.
`admin/(protected)/layout.tsx` es un route group que valida la cookie
`admin_token` y redirige a `/admin/login` si no coincide.

**Supabase.** `supabaseAnon()` se usa en el endpoint público de testimonios y
queda sujeto a las políticas de RLS. `supabaseAdmin()` usa la service role y
saltea RLS: reservado para las rutas de `/api/admin`.

**shadcn/ui.** `components.json` está configurado y `globals.css` define los
tokens del sistema (colores, radios, variantes dark), pero no hay componentes
generados en `src/components/ui/`: los componentes son propios, escritos
directamente sobre Radix.
