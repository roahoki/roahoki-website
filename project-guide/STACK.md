# El stack, explicado

Referencia del stack de este proyecto, escrita para alguien que viene de **Ruby
on Rails**. No es documentación de las herramientas —para eso están sus docs
oficiales— sino la explicación de **por qué este proyecto está armado así** y qué
hay que entender para modificarlo con criterio.

Todos los ejemplos salen del código real del repo.

## Índice

1. [El cambio mental: Rails → Next.js](#1-el-cambio-mental-rails--nextjs)
2. [Next.js](#2-nextjs)
3. [Vercel y el modelo serverless](#3-vercel-y-el-modelo-serverless)
4. [Supabase](#4-supabase)
5. [Storage: imágenes y video](#5-storage-imágenes-y-video)
6. [Drizzle](#6-drizzle)
7. [Diseño de datos](#7-diseño-de-datos)
8. [Qué hay que manejar sí o sí](#8-qué-hay-que-manejar-sí-o-sí)

---

## 1. El cambio mental: Rails → Next.js

Esta es la idea que desbloquea todo lo demás.

**Rails es un framework full-stack con opinión sobre todo**: ORM, migraciones,
rutas, controllers, vistas, jobs, mailers, testing, storage. Instalas Rails y ya
tienes una respuesta para cada pregunta.

**Next.js cubre solamente dos cosas: enrutado y renderizado.** Nada más.

No trae ORM. No trae migraciones. No trae background jobs. No trae mailers. No
trae capa de datos de ningún tipo. Todo eso se elige pieza por pieza.

Esa es la razón estructural por la que este repo llegó a estar inconsistente:
**Next.js no obliga a nada**, así que sin convenciones escritas cada archivo
inventa la suya. No es un defecto del framework ni un descuido puntual — es la
consecuencia directa de su alcance. Por eso existe `CLAUDE.md` en la raíz.

| Rails | Next.js (App Router) |
| --- | --- |
| `config/routes.rb` | La estructura de carpetas **es** el routing |
| `app/controllers/` | `route.ts` (Route Handlers) |
| `app/views/*.erb` | Componentes React (`page.tsx`) |
| `application.html.erb` | `layout.tsx` (anidable) |
| `before_action :authenticate!` | Un `layout.tsx` en un route group |
| ActiveRecord | ❌ no existe — acá: Drizzle |
| `db/migrate/` | ❌ no existe — lo trae el ORM |
| ActiveStorage | ❌ no existe — acá: Supabase Storage |
| Sidekiq / ActiveJob | ❌ no existe — cron o servicio externo |
| Puma (proceso vivo) | Funciones serverless efímeras |
| `Gemfile` | `package.json` |

---

## 2. Next.js

### 2.1 El routing es el sistema de archivos

No hay `routes.rb`. La ruta **es** la carpeta:

```
src/app/logbook/page.tsx           →  /logbook
src/app/logbook/[slug]/page.tsx    →  /logbook/mi-nota      (slug = "mi-nota")
src/app/api/testimonials/route.ts  →  /api/testimonials     (endpoint JSON)
```

Nombres de archivo reservados:

| Archivo | Qué es |
| --- | --- |
| `page.tsx` | Una página visitable |
| `layout.tsx` | Envoltorio de todo lo que cuelga debajo. Anidable |
| `route.ts` | Endpoint HTTP (JSON). No conviven `page.tsx` y `route.ts` en la misma carpeta |
| `loading.tsx` | UI mientras carga (Suspense automático) |
| `error.tsx` | UI cuando algo revienta |
| `not-found.tsx` | 404 |
| `sitemap.ts` / `opengraph-image.tsx` | Archivos de metadata, generados en build |

Y dos convenciones de carpeta que hay que conocer:

**`[param]` — segmento dinámico.** `src/app/logbook/[slug]/page.tsx` captura
`/logbook/lo-bueno-toma-tiempo`. El valor llega como prop:

```tsx
// src/app/logbook/[slug]/page.tsx
export default async function EntryPage({ params }: {
  params: Promise<{ slug: string }>   // ojo: en Next 15+ params es una Promise
}) {
  const { slug } = await params
```

**`(grupo)` — route group.** Los paréntesis agrupan **sin aparecer en la URL**.
Este es el que más confunde al principio:

```
src/app/admin/(protected)/testimonials/page.tsx   →   /admin/testimonials
                                                       ↑ sin "/protected"
```

¿Para qué sirve entonces? Para poder colgarle un `layout.tsx` común a un conjunto
de rutas. Y ese layout es la autenticación del panel:

```tsx
// src/app/admin/(protected)/layout.tsx
export default async function ProtectedAdminLayout({ children }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  // La segunda condición evita que un ADMIN_PASSWORD vacío deje pasar a todos.
  if (token !== process.env.ADMIN_PASSWORD || !process.env.ADMIN_PASSWORD) {
    redirect("/admin/login")
  }
  return <div>{children}</div>
}
```

**Ese es el `before_action :authenticate!` de este proyecto.** Todo lo que se
ponga dentro de `(protected)/` queda protegido automáticamente, sin repetir el
chequeo en cada página. Por eso el login vive *fuera* del grupo
(`src/app/admin/login/page.tsx`): si estuviera dentro, redirigiría a sí mismo en
un bucle infinito.

### 2.2 Server Components: la parte que de verdad importa

**Por defecto, todo componente corre en el servidor y nunca llega al browser.**
Puede ser `async` y consultar la base de datos directamente:

```tsx
// src/components/landing-testimonials.tsx — corre solo en el servidor
export async function LandingTestimonials() {
  const { data } = await supabaseAnon()
    .from("testimonials").select("*").eq("status", "approved")
  return <div>{/* ... */}</div>
}
```

Al browser solo le llega el HTML resultante. El código de la query nunca se
descarga. **Es un partial de ERB que además puede hacer la query.**

Cuando se necesita interactividad —estado, `onClick`, hooks— se marca el archivo
con `"use client"` en la primera línea:

```tsx
// src/components/navbar.tsx
"use client"
import { useState, useRef } from "react"
```

Ese componente sí viaja al browser como JavaScript.

**La regla:** servidor por defecto, cliente solo cuando hay interacción real, y
lo más abajo posible en el árbol. Cada `"use client"` es JS que el visitante
descarga. Es la decisión de rendimiento que se toma más veces en el proyecto.

**La frontera es real, no una sugerencia.** Un Server Component puede *renderizar*
un Client Component, pero un Client Component **no puede importar** uno de
servidor. Si un componente de cliente necesita datos, se le pasan como props
desde el servidor.

```
┌─ Server Component (puede hacer queries) ─────────┐
│  const notes = await db.select()...              │
│                                                   │
│  ┌─ "use client" (interactivo) ──────────────┐   │
│  │  recibe `notes` como prop  ✅              │   │
│  │  no puede importar el módulo de db  ❌     │   │
│  └───────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

### 2.3 Los tres modos de render

Rails renderiza en cada request, siempre. Next.js tiene tres modos, y elegir mal
es la causa más común de "publiqué algo y no aparece":

| Modo | Cuándo se genera | Cómo se activa |
| --- | --- | --- |
| **Estático** | Una vez, en el build | Por defecto, si nada es dinámico |
| **ISR** | En el build, y se regenera cada N segundos | `export const revalidate = 60` |
| **Dinámico** | En cada request | Usar `cookies()`, `headers()`, o `export const dynamic = "force-dynamic"` |

Para el logbook, **ISR** es lo correcto: las notas se sirven como HTML estático
precompilado —rapidísimo, ideal para un link que se comparte masivamente— y se
regeneran solas. El panel `/admin` es dinámico porque lee `cookies()`.

Esto no tiene equivalente en Rails y es una de las ventajas reales de Next.

### 2.4 El middleware se llama `proxy.ts`

En Next.js 16 el archivo de middleware pasó a llamarse `proxy.ts`. Corre antes
de cada request que cae en su `matcher`, y acá atiende una sola cosa:

```ts
// src/proxy.ts
export const config = {
  matcher: ["/admin/:path*"],
}
```

Solo `/admin`, porque es lo único que lo necesita: el middleware le inyecta el
`x-pathname` al request, y el layout protegido lo lee para armar el `?next=` del
redirect al login. Una página no puede conocer su propio pathname en el
servidor, y de ahí el rodeo.

Vale la pena saber cómo era antes, porque explica la forma del archivo: mientras
hubo dos idiomas, el matcher era una **lista de exclusiones** —atrapaba todo y
next-intl mandaba lo atrapado a `/<locale>/...`—. Cada ruta nueva que no debía
llevar prefijo había que acordarse de excluirla, y olvidarse no rompía ningún
build: la página quedaba perfecta y en producción respondía un redirect a una
URL inexistente. Al quitar next-intl esa trampa desapareció.

---

## 3. Vercel y el modelo serverless

Vercel es la PaaS de los creadores de Next.js. Análogo aproximado: Heroku. Se
conecta el repo de GitHub y cada push a `main` despliega.

Pero hay una diferencia profunda con un servidor Rails, y de ella salen casi
todas las decisiones raras del stack:

> **Rails corre en Puma: un proceso de larga vida, con memoria y un pool de
> conexiones a Postgres. Vercel corre serverless: cada request puede levantar una
> instancia nueva y efímera que muere al terminar.**

Las cuatro consecuencias:

**1. No hay pool de conexiones compartido.** En Rails, Puma abre 5 conexiones y
las reusa toda la vida del proceso. En serverless, muchos requests concurrentes
pueden abrir muchas conexiones a Postgres, que tiene un límite duro. **Por eso
hay que conectarse a través de un pooler** (pgbouncer) en vez de directo. Ver
[§6.2](#62-las-dos-connection-strings).

**2. No hay estado en memoria entre requests.** Nada de variables globales que
sobrevivan, caches en memoria ni el equivalente a `@@class_variables`. Si algo
debe persistir, va a la base de datos.

**3. No hay Sidekiq.** No existe un proceso permanente para background jobs. Se
resuelve con cron jobs de Vercel o un servicio externo de colas.

**4. Hay un límite de tamaño de request** (del orden de 4.5 MB en el body de una
función serverless). Determinante para subir archivos — ver [§5.3](#53-los-dos-patrones-de-subida).

---

## 4. Supabase

Mentalmente: **"Firebase, pero con un Postgres de verdad debajo"**. Es una
instancia de PostgreSQL con varios servicios montados encima.

| Servicio | Qué es | ¿Se usa acá? |
| --- | --- | --- |
| **Postgres** | La base de datos. Postgres estándar con connection string | Sí |
| **PostgREST** | Una API REST **autogenerada** a partir de las tablas | Sí (legado) |
| **RLS** | Seguridad a nivel de fila (feature de Postgres, no de Supabase) | Sí |
| **Storage** | Archivos con CDN | Sí — bucket `testimonial-images` |
| **Auth** | Gestión de usuarios | No — el panel usa password propia |
| **Realtime** | Cambios por WebSocket | No |
| **Edge Functions** | Funciones en Deno | No |

### 4.1 Los dos caminos a los datos

Esta es la clave para entender el código de este repo.

**Camino A — vía PostgREST:**

```
tu código → supabase-js → HTTP → PostgREST → Postgres
```

Cuando se escribe `supabaseAnon().from("testimonials").select("*")`, **eso no es
una query SQL**. Es una petición HTTP a:

```
https://<proyecto>.supabase.co/rest/v1/testimonials?select=*
```

Supabase generó una API REST completa a partir de las tablas.

**Camino B — Postgres directo:**

```
tu código → Drizzle → connection string → Postgres
```

Una conexión TCP normal, como la que haría Rails.

| | Camino A (PostgREST) | Camino B (Postgres directo) |
| --- | --- | --- |
| Funciona desde el browser | ✅ Sí | ❌ No, solo servidor |
| Pasa por RLS | ✅ Sí | ❌ **No** |
| Poder expresivo | Limitado (joins simples) | SQL completo |
| Atado a Supabase | ✅ Sí | ❌ Portable a cualquier Postgres |

**Decisión de este proyecto:** el camino B (Drizzle) para todo acceso a datos, y
`supabase-js` confinado a `src/lib/storage/`. Esa es la portabilidad: migrar a
Cloud SQL de Google el día que se quiera es cambiar una connection string, no
reescribir la aplicación.

### 4.2 RLS: por qué existe y por qué es crítico

**Lo más importante de Supabase, y no tiene análogo en Rails.**

La API REST **está expuesta a internet**, y la clave `NEXT_PUBLIC_SUPABASE_ANON_KEY`
viaja al browser de cualquier visitante. Es pública por diseño: cualquiera puede
abrir la consola del navegador, copiarla y pegarle a la API.

Lo único que impide que se lleven la base de datos completa es **Row Level
Security**: políticas SQL que Postgres evalúa en cada query, decidiendo qué filas
puede ver quién.

```sql
-- Cualquiera puede leer, pero solo los testimonios aprobados
create policy "public reads approved"
  on testimonials for select
  using (status = 'approved');
```

En Rails esto no existe porque **nadie habla con Postgres salvo el propio
código**: la seguridad vive en los controllers. En Supabase la seguridad tiene
que vivir *en la base de datos*, porque la base de datos está expuesta.

> **Cada tabla nueva nace sin políticas.** Sin RLS habilitado queda abierta; con
> RLS habilitado y sin políticas queda cerrada. Nunca es "lo correcto" por
> defecto. Por eso la regla del repo: toda tabla nueva lleva sus políticas en la
> misma migración que la crea.

### 4.3 El trade-off de usar Drizzle

**Drizzle usa el camino B, así que no pasa por RLS.** Se la salta por completo.

Esto no es un bug: es cómo funciona cualquier aplicación con ORM, incluida
cualquier app de Rails. Pero traslada la responsabilidad:

- **La validación server-side pasa a ser la barrera principal.** De ahí que los
  esquemas de zod en `src/lib/schemas/` no sean opcionales.
- **RLS se mantiene activo igual**, como red de seguridad para todo lo que siga
  usando la anon key desde el browser (hoy, la subida de imágenes del formulario
  público de testimonios).

Las dos capas conviven. Una protege del acceso directo a la API; la otra protege
la lógica de negocio.

### 4.4 Las claves

| Variable | Alcance | Dónde puede vivir |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | Cualquier lado |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública, sujeta a RLS | Cualquier lado |
| `SUPABASE_SERVICE_ROLE_KEY` | **Saltea RLS por completo** | Solo servidor |
| `DATABASE_URL` | Credenciales de Postgres | Solo servidor |

El prefijo `NEXT_PUBLIC_` no es decorativo: **Next.js inyecta esas variables en el
bundle del browser**. Poner una clave secreta bajo ese prefijo la publica a todo
internet.

Las claves nuevas de Supabase tienen formato `sb_publishable_...` y
`sb_secret_...`; las antiguas son JWT (`eyJ...`). Ambas funcionan.

---

## 5. Storage: imágenes y video

### 5.1 El principio

**Los archivos nunca van dentro de la base de datos.** Van a un *object storage* y
en la DB se guarda solo la URL o el path.

Es lo mismo que hace ActiveStorage por debajo (blobs en S3, referencia en
Postgres), pero **sin** la capa de conveniencia: no hay `has_one_attached`, no hay
variants automáticas, no hay limpieza de huérfanos. Se cablea a mano.

### 5.2 Buckets

Un bucket es un contenedor de archivos con políticas propias. El de este
proyecto:

```json
{
  "name": "testimonial-images",
  "public": true,
  "file_size_limit": 2097152,
  "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]
}
```

- **`public: true`** → cualquiera con la URL ve el archivo, y la URL es
  permanente. Correcto para contenido público como el logbook.
- **`public: false`** → hay que generar una *signed URL* (firmada, con
  expiración). Para documentos privados.

El límite de tamaño y los MIME types **se aplican en el servidor de Supabase**,
no en el código del cliente. Es una barrera real, no una validación cosmética que
se pueda saltar desde la consola del navegador.

### 5.3 Los dos patrones de subida

**Patrón 1 — el archivo pasa por el servidor:**

```
browser → POST /api/upload (función serverless) → Storage
```

Se controla todo: validar, renombrar, registrar en la DB, autorizar. **Pero el
archivo atraviesa Vercel y choca con el límite de ~4.5 MB.**

**Patrón 2 — subida directa desde el browser:**

```
browser → Storage (directo, con anon key o signed URL)
```

Esquiva el límite de Vercel. Es lo que hace el formulario público de testimonios
(`src/app/(site)/testimonials/new/page.tsx`):

```tsx
const { error } = await supabase.storage
  .from("testimonial-images")
  .upload(filename, imageFile)
```

Acá el navegador habla directo con Supabase. Lo que protege el bucket son sus
propias políticas y sus límites, no el código de la aplicación.

**Cuál usar:** patrón 1 cuando quien sube está autenticado y los archivos son
chicos (el editor del logbook). Patrón 2 cuando el archivo es grande o el
usuario es anónimo.

### 5.4 Optimización de imágenes

Next.js trae un componente `<Image>` que, en Vercel, **redimensiona y convierte a
WebP automáticamente**, sirviendo el tamaño justo para cada dispositivo. Es el
equivalente a las `variants` de ActiveStorage, pero on-the-fly y cacheado en CDN.

Por eso existe esto:

```ts
// next.config.ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "img.youtube.com" },
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
    { protocol: "https", hostname: "xutwlpliollsczaatoxd.supabase.co" },
  ],
}
```

**Esa lista es un allowlist de seguridad**, no una configuración de conveniencia.
Next solo optimiza imágenes de hosts autorizados explícitamente; si no,
cualquiera podría usar el Vercel de este proyecto como servicio gratuito de
procesamiento de imágenes ajenas.

**Host nuevo de imágenes = agregarlo acá, o `next/image` falla en runtime.**

### 5.5 Por qué el video es un problema distinto

El video no es "una imagen pero más grande". Es otra categoría:

1. **Tamaño.** Un video de celular de un minuto pesa 50–100 MB. No pasa por una
   función serverless. Obliga al patrón 2.
2. **Sin transcoding.** Supabase Storage es almacenamiento puro: guarda el MP4 tal
   cual. No genera versiones en distintas calidades. Si se sube un archivo de
   100 MB, **cada visitante descarga 100 MB**.
3. **Sin streaming adaptativo.** Sin HLS/DASH el navegador descarga el archivo
   completo en vez de ajustar la calidad a la conexión.
4. **Bandwidth.** Las cuotas de transferencia del plan gratuito se agotan rápido
   con video.

| Opción | Cuándo | Costo |
| --- | --- | --- |
| **YouTube embed** | Video largo, docencia | Gratis — ya existe `src/components/youtube-embed.tsx` |
| **Supabase Storage** | Clips cortos (<10 MB) | Incluido, pero consume cuota |
| **Mux / Cloudflare Stream** | Video como pilar de la marca | Pago, con transcoding y streaming real |

**Decisión actual:** video propio fuera de alcance. Para video se usa YouTube.

---

## 6. Drizzle

### 6.1 Qué es, y qué no

Sí: es un traductor de TypeScript a SQL. Con dos matices que importan viniendo de
ActiveRecord.

**Matiz 1: es un query builder tipado, no un ORM completo.** No hay objetos con
comportamiento. No existe `nota.save`, no hay callbacks, no hay validaciones en
el modelo ni asociaciones mágicas. Se define el esquema como estructuras de datos
y se escriben queries que se parecen deliberadamente a SQL:

```ts
// Drizzle
await db.select().from(logbookEntries)
  .where(eq(logbookEntries.status, "published"))
  .orderBy(desc(logbookEntries.publishedAt))
```
```ruby
# ActiveRecord
LogbookEntry.where(status: "published").order(published_at: :desc)
```

Más verboso. **A cambio, TypeScript conoce el tipo exacto del resultado.** Si se
borra la columna `summary`, el compilador señala *todos* los lugares que la usan,
antes de correr nada. ActiveRecord no puede darlo porque Ruby es dinámico: el
error aparece en producción.

Ese es el trato completo: se escribe más, y los errores de esquema aparecen al
compilar en vez de en runtime.

**Matiz 2: las migraciones son declarativas, al revés que en Rails.**

| | Rails | Drizzle |
| --- | --- | --- |
| Qué se escribe | El **cambio** (`add_column :notes, :slug, :string`) | El **estado final** (se agrega el campo a `schema.ts`) |
| Qué se deriva | `schema.rb` | El SQL de la diferencia |
| Comando | `rails g migration` | `drizzle-kit generate` |

El SQL generado queda en un archivo versionado en `drizzle/`, que se revisa antes
de aplicar. Igual de auditable que Rails, con el flujo invertido.

**Por qué Drizzle y no Prisma.** Prisma es más popular y más mágico: lenguaje de
esquema propio, cliente generado, motor binario aparte. Drizzle es una capa fina
sobre SQL. Para alguien que ya entiende SQL, Drizzle es mejor: no hay magia opaca
entre lo que se escribe y lo que corre. Y como habla Postgres estándar, es lo que
da la portabilidad fuera de Supabase.

### 6.2 Las dos connection strings

```bash
# Runtime de la app. Transaction pooler (pgbouncer), puerto 6543.
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@<region>.pooler.supabase.com:6543/postgres

# Solo para drizzle-kit. Conexión directa, puerto 5432.
DIRECT_URL=postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
```

**Por qué dos.** Por [§3](#3-vercel-y-el-modelo-serverless): la app corre
serverless y no puede abrir conexiones directas sin agotar el límite de Postgres.
El pooler las multiplexa. Pero las herramientas de migración necesitan una
conexión directa, porque el pooler en modo transaction no soporta todo lo que una
migración hace.

**Consecuencia práctica:** con el transaction pooler hay que configurar
`prepare: false` en el driver postgres.js. Pgbouncer en modo transaction no
soporta prepared statements, y sin ese flag las queries fallan de forma
confusa.

---

## 7. Diseño de datos

### 7.1 La tabla del logbook

```sql
create table logbook_entries (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  summary          text,
  body_md          text not null,
  cover_image_url  text,
  tags             text[] not null default '{}',
  status           text not null default 'published',
  published_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
```

El porqué de cada decisión:

**`slug` único a nivel de base de datos.** Es la URL pública. Único como
constraint, no solo validado en código: es la única garantía real cuando hay
concurrencia.

**`body_md` guarda markdown crudo, nunca HTML.** Se guarda la fuente y se
renderiza al mostrar. Si mañana cambia el renderizador o el diseño, el contenido
no está contaminado con HTML viejo. **Nunca guardar el output renderizado como
fuente de verdad.**

**No hay tabla de imágenes.** Las imágenes viven embebidas en el markdown
(`![](url)`), como en cualquier blog. Una tabla de adjuntos agregaría joins y
sincronización a cambio de nada.

**`published_at` separado de `created_at`.** Uno es cuándo se escribió, otro
cuándo salió al público. Se separan solos en cuanto haya borradores.

**`status` existe aunque no haya UI de borradores.** Agregar una columna después
obliga a revisar todas las queries públicas; crearla ahora cuesta cero.

### 7.2 El caso `text[]` vs. tabla normalizada

Vale la pena detenerse acá porque es el ejemplo trabajado de la heurística de
diseño de todo el proyecto.

La respuesta normalizada, la de los libros —y la que haría Rails con
`has_and_belongs_to_many`—:

```
tags (id, name, slug)
logbook_entry_tags (entry_id, tag_id)
```

Es correcta. Pero **resuelve un problema que este proyecto no tiene.** La
normalización sirve cuando hay múltiples autores escribiendo tags inconsistentes,
cuando renombrar un tag debe propagarse, o cuando los tags tienen atributos
propios.

Acá hay un autor. Y Postgres soporta arrays nativos con índices GIN:

```sql
create index idx_logbook_tags on logbook_entries using gin (tags);
select * from logbook_entries where tags @> array['arquitectura'];
```

| | `text[]` | Tabla normalizada |
| --- | --- | --- |
| Tablas | 1 | 3 |
| Query por tag | Directa, con índice GIN | Dos joins |
| Renombrar un tag | Un `UPDATE` con array | Un `UPDATE` en una fila |
| Evitar typos y duplicados | Responsabilidad del código | La DB lo garantiza |

**Se elige `text[]`** porque normalizar cuesta código extra que hay que mantener y
con un solo autor no compra nada — y sobre todo porque **migrar de array a tabla
después es una sola migración mecánica y sin pérdida de datos.**

### 7.3 La heurística

> **Preferir la opción simple cuando migrar a la compleja sea barato. Invertir en
> la compleja solo cuando cambiar después sea caro.**

Es la regla que explica decisiones que de otro modo parecen contradictorias:

- Tags como array, no tabla → **barato de migrar** después.
- Sin UI de borradores, pero con la columna `status` → **caro de retrofitear** si
  falta.
- Esquema versionado con migraciones desde el día uno → **carísimo** de
  reconstruir si se pierde.
- Storage detrás de una interfaz → **caro** de desacoplar una vez esparcido por
  todo el código.

---

## 8. Qué hay que manejar sí o sí

Lo innegociable para modificar este proyecto con criterio:

1. **Server Components vs Client Components**, y qué implica cada `"use client"`.
2. **El routing es el sistema de archivos**, incluidos `layout.tsx` y los route
   groups `(...)`.
3. **Los dos caminos a los datos**, y que Drizzle se salta RLS.
4. **El storage es externo a la DB**; en la base solo van URLs.
5. **Serverless es efímero** — de ahí el pooler y la ausencia de estado en
   memoria.
6. **`NEXT_PUBLIC_` publica la variable al browser.**

Se puede ignorar por ahora: Supabase Auth, Realtime, Edge Functions, Server
Actions, y las opciones avanzadas de caché de Next.

---

## Apéndice: el flujo completo de un request

Para fijar cómo encajan las piezas, el camino de alguien que abre una nota del
logbook:

```
1. Visitante                    GET roahoki.com/logbook/mi-nota
                                          │
2. Vercel Edge                   ¿hay HTML cacheado y vigente (ISR)?
                                    ├── sí → lo devuelve. FIN (rapidísimo)
                                    └── no → levanta una función serverless
                                          │
3. proxy.ts                      matcher excluye /logbook → no interviene
                                          │
4. page.tsx (Server Component)   getBySlug("mi-nota")
                                          │
5. Drizzle                       SQL por el pooler (puerto 6543)
                                          │
6. Postgres                      devuelve la fila. RLS no interviene:
                                 es conexión directa
                                          │
7. Render en servidor            markdown → HTML, sanitizado
                                          │
8. Respuesta                     HTML + JS solo de los componentes "use client"
                                          │
9. <Image>                       las imágenes se piden a /_next/image,
                                 que las optimiza desde Supabase Storage
                                 (autorizado en remotePatterns)
```

Y el de publicar una nota desde el panel:

```
1. Autor          POST /admin/logbook/new  (cookie de sesión firmada)
                            │
2. layout.tsx     (protected) valida la cookie → si no, redirect a /admin/login
                            │
3. route.ts       valida el payload con zod
                            │
4. Imagen         POST /api/admin/logbook/upload → StorageAdapter → bucket
                  (patrón 1: pasa por el servidor, límite ~4.5 MB)
                            │
5. Drizzle        INSERT en logbook_entries
                            │
6. revalidate     Next regenera el HTML estático de /logbook
```
