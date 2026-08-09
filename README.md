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
| i18n | next-intl (es por defecto, en) |
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
│   ├── [locale]/          Sitio público, rutas por idioma
│   │   ├── page.tsx        Landing (hero, stack, experiencia, testimonios)
│   │   ├── experience/
│   │   ├── projects/
│   │   ├── teaching/
│   │   └── testimonials/new/   Formulario público de testimonios
│   ├── admin/             Panel privado
│   │   ├── login/
│   │   └── (protected)/    Dashboard y moderación de testimonios
│   └── api/
│       ├── testimonials/           POST público del formulario
│       └── admin/{login,logout,testimonials}
├── components/            UI compartida + icons/ (logos de experiencia)
├── i18n/                  routing, navigation y request de next-intl
├── lib/                   supabase.ts (clientes anon y admin), utils.ts
└── proxy.ts               Middleware de i18n

messages/{es,en}.json      Traducciones
project-guide/             Notas de trabajo: PROJECT, TODO, BACKLOG
```

### Notas de arquitectura

**Middleware.** En Next.js 16 el archivo pasó a llamarse `proxy.ts`. Aplica el
routing de next-intl y excluye del matcher `/api`, `/admin` y los estáticos, así
que el panel no queda bajo prefijo de idioma.

**Rutas públicas vs. privadas.** El sitio público vive bajo `[locale]`; el panel
cuelga de `/admin` sin locale. `admin/(protected)/layout.tsx` es un route group
que valida la cookie `admin_token` y redirige a `/admin/login` si no coincide.

**Supabase.** `supabaseAnon()` se usa en el endpoint público de testimonios y
queda sujeto a las políticas de RLS. `supabaseAdmin()` usa la service role y
saltea RLS: reservado para las rutas de `/api/admin`.

**shadcn/ui.** `components.json` está configurado y `globals.css` define los
tokens del sistema (colores, radios, variantes dark), pero no hay componentes
generados en `src/components/ui/`: los componentes son propios, escritos
directamente sobre Radix.
