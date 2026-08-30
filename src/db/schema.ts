import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { EXERCISE_SLUGS } from "@/lib/stats/exercises";
import { anonRole, serviceRole } from "./roles";

/**
 * Esquema de la base de datos. Esta es la fuente de verdad: el dashboard de
 * Supabase no lo es. Todo cambio de estructura se hace acá y se aplica con una
 * migración generada por `drizzle-kit`, nunca a mano en el panel.
 *
 * El punto de partida se obtuvo con `drizzle-kit pull` sobre la base existente,
 * pero el resultado se revisó y corrigió a mano — ver la nota en las políticas.
 */

export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    message: text().notNull(),
    // El `enum` es solo a nivel de tipos: la columna sigue siendo `text` y no
    // genera migración. Quien lo hace cumplir en la base es el check de más
    // abajo. Sirve para que TypeScript conozca los tres valores en vez de ver
    // un `string` cualquiera, y para no tener que repetirlos a mano.
    status: text({ enum: ["pending", "approved", "rejected"] })
      .default("pending")
      .notNull(),
    imageUrl: text("image_url"),
    linkedinUrl: text("linkedin_url"),
    githubUsername: text("github_username"),
    email: text(),
    // `mode: "string"` en vez de Date: estas filas viajan de Server a Client
    // Components, y un Date no es serializable a través de esa frontera.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  () => [
    check(
      "testimonials_status_check",
      sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`,
    ),

    // OJO: `drizzle-kit pull` generó esta política SIN la cláusula `using`,
    // pese a que en la base sí existe:
    //
    //   select policyname, qual from pg_policies where tablename = 'testimonials';
    //   → public can read approved | (status = 'approved'::text)
    //
    // El efecto de aplicarla así es el opuesto al que sugiere el nombre: sin
    // `using`, Postgres evalúa la condición como NULL y **no deja pasar ninguna
    // fila**. La tabla no queda expuesta, queda muda: la landing dejaría de
    // mostrar testimonios, y el fallo sería silencioso porque una política que
    // existe y se llama bien no levanta sospechas al revisarla por encima.
    //
    // Se restauró a mano. Al regenerar el esquema hay que verificar que siga.
    pgPolicy("public can read approved", {
      as: "permissive",
      for: "select",
      to: anonRole,
      using: sql`status = 'approved'`,
    }),

    // TODO(seguridad): `withCheck: true` deja que cualquiera inserte con el
    // status que quiera, incluido 'approved', pegándole directo a la API REST
    // de Supabase con la anon key y saltándose la moderación. Debería ser
    // `status = 'pending'`. Se corrige en su propia PR para no mezclarlo acá.
    pgPolicy("public can insert", {
      as: "permissive",
      for: "insert",
      to: anonRole,
      withCheck: sql`true`,
    }),

    pgPolicy("service role full access", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
export type TestimonialStatus = Testimonial["status"];

/**
 * Las notas del logbook.
 *
 * El contenido se guarda como **markdown crudo, nunca HTML**. Renderizar es
 * responsabilidad de la lectura (`src/lib/markdown.tsx`, PR 11): guardar HTML
 * significaría que la sanitización ocurrió una vez, en la escritura, y que
 * cualquier error de entonces queda grabado en la base para siempre.
 *
 * Las imágenes viven embebidas en el markdown y no en una tabla de adjuntos.
 * Con un solo autor, una tabla aparte solo agrega un join para resolver algo
 * que el propio texto ya expresa.
 */
export const logbookEntries = pgTable(
  "logbook_entries",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    // La URL pública. Único porque `/logbook/[slug]` tiene que resolver a una
    // sola nota; sin la restricción, un duplicado se detectaría recién al leer.
    slug: text().notNull(),
    title: text().notNull(),
    // Sale en el listado y en `og:description`. Opcional: una nota corta puede
    // no necesitarlo, y forzarlo obligaría a inventar texto.
    summary: text(),
    bodyMd: text("body_md").notNull(),
    coverImageUrl: text("cover_image_url"),
    // `text[]` con índice GIN en vez de tabla de tags. Con un solo autor,
    // normalizar es prematuro; migrar después es un `insert … select` y nada
    // más. Ver la heurística en LOGBOOK-ROADMAP.md.
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    // Nace ya con los dos estados aunque no haya UI de borradores. Cuesta cero
    // ahora, y agregarlo después obligaría a revisar todas las queries públicas
    // para recordar cuáles tienen que filtrar.
    status: text({ enum: ["draft", "published"] })
      .default("published")
      .notNull(),
    // Separada de `created_at` a propósito: permite fechar una nota en el día
    // que ocurrió lo que cuenta, no en el día que se escribió.
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("logbook_entries_slug_key").on(table.slug),

    check(
      "logbook_entries_status_check",
      sql`status = ANY (ARRAY['draft'::text, 'published'::text])`,
    ),

    // Un slug vacío produciría `/logbook/`, que es el listado. La validación de
    // zod es la barrera principal, pero esto lo hace imposible incluso desde
    // psql.
    check("logbook_entries_slug_not_empty", sql`length(slug) > 0`),

    // GIN es el índice que sirve para `tags @> ARRAY['x']`, que es como
    // consulta `arrayContains` de Drizzle. Un B-tree sobre un array indexa el
    // array entero como valor y no responde "cuáles contienen este tag".
    index("logbook_entries_tags_idx").using("gin", table.tags),

    // El listado público ordena por `published_at desc` filtrando por estado.
    // El índice compuesto cubre las dos cosas en una sola pasada.
    index("logbook_entries_status_published_at_idx").on(
      table.status,
      table.publishedAt.desc(),
    ),

    // RLS en la misma migración que crea la tabla, como exige CLAUDE.md. Sin
    // políticas la tabla queda cerrada; sin RLS queda abierta a internet.
    // Ninguna de las dos es lo correcto por defecto.
    pgPolicy("public can read published logbook entries", {
      as: "permissive",
      for: "select",
      to: anonRole,
      using: sql`status = 'published'`,
    }),

    // No hay política de insert/update/delete para `anon`: escribir en el
    // logbook pasa solo por el panel, que va por Drizzle con la conexión
    // dueña de la base. A diferencia de `testimonials`, acá no hay alta
    // pública que habilitar.
    pgPolicy("service role full access to logbook entries", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type LogbookEntry = typeof logbookEntries.$inferSelect;
export type NewLogbookEntry = typeof logbookEntries.$inferInsert;
export type LogbookStatus = LogbookEntry["status"];

/**
 * Los contadores de ejercicio, guardados como **log de eventos**: cada tap del
 * panel inserta una fila con su `delta`, y el número que se muestra es la suma
 * sobre un rango de fechas.
 *
 * La alternativa era una fila por ejercicio con un entero que se incrementa.
 * Se descartó por dos razones. La primera es que el reinicio semanal dejaría de
 * ser gratis: habría que poner algo a correr los lunes a las 00:00 que ponga
 * los contadores en cero, y ese algo puede no correr —o correr dos veces— sin
 * que nadie se entere hasta que el número esté mal. Con eventos, la semana
 * nueva empieza en cero porque la ventana de la query se movió, y no hay nada
 * que pueda fallar. La segunda es que un contador mutable **destruye** el dato
 * en cada reinicio: no quedaría con qué sacar las estadísticas de más adelante.
 *
 * El costo es una fila por tap. Con un solo autor son unos pocos miles de filas
 * al año, que para Postgres no es nada.
 */
export const exerciseCounterEvents = pgTable(
  "exercise_counter_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    // Igual que `status` en las otras tablas: el `enum` es solo a nivel de
    // tipos y quien lo hace cumplir es el check de más abajo. La lista viene de
    // `EXERCISE_SLUGS` para no escribirla dos veces.
    exercise: text({ enum: EXERCISE_SLUGS }).notNull(),
    // Con signo: el botón "−" del panel inserta un evento negativo en vez de
    // borrar el positivo que lo precede. Borrar dejaría el historial contando
    // una sesión que no fue, y acá el historial es el punto.
    //
    // Es un entero y no un booleano de "suma/resta" para que el paso pueda
    // cambiar sin tocar la tabla: hoy cada tap vale 1, incluidos los segundos
    // de handstand.
    delta: integer().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "exercise_counter_events_exercise_check",
      sql`exercise = ANY (ARRAY['pull_ups'::text, 'push_ups'::text, 'squats'::text, 'dips'::text, 'handstand_seconds'::text, 'pistol_squats'::text])`,
    ),

    // Un `delta` de 0 sería una fila que no cambia ningún total: ruido puro en
    // los datos de los que después hay que sacar estadísticas. La cota superior
    // es defensiva: zod ya valida el paso, y esto acota el daño de un bug que
    // mande un número absurdo a un valor del que se puede volver.
    check(
      "exercise_counter_events_delta_check",
      sql`delta <> 0 AND abs(delta) <= 1000`,
    ),

    // La única query que corre en caliente filtra por rango de fechas y agrupa
    // por ejercicio. Para que el rango sea indexable, `created_at` tiene que
    // ser la columna principal. Agregar `exercise` y `delta` al índice lo
    // volvería covering, pero con este volumen de filas no se nota.
    index("exercise_counter_events_created_at_idx").on(table.createdAt),

    // RLS en la misma migración que crea la tabla, como exige CLAUDE.md.
    //
    // **No hay ninguna política para `anon`, y es deliberado.** La página
    // pública no lee esta tabla desde el browser: la lee el servidor por
    // Drizzle, que conecta como dueño de la base y ni siquiera pasa por RLS.
    // Así que `anon` no necesita leer, y mucho menos escribir.
    //
    // Vale la pena mirar el contraste con `testimonials`, que sí tiene un
    // `public can insert` con `withCheck: true`. Ahí es un agujero conocido
    // (ver el TODO de esa tabla); en una tabla de contadores sería peor: le
    // daría a cualquiera con la anon key —que va en el bundle del browser, o
    // sea, cualquiera— la posibilidad de inflar los números del sitio.
    pgPolicy("service role full access to exercise counter events", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type ExerciseCounterEvent = typeof exerciseCounterEvents.$inferSelect;
export type NewExerciseCounterEvent = typeof exerciseCounterEvents.$inferInsert;
