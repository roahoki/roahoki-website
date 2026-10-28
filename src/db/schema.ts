import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  DEFAULT_INVITED_EVENTS,
  EVENT_SLUGS,
  type EventDetail,
} from "@/lib/birthday/events";
import type { Roki } from "@/lib/birthday/roki";
import { COVER_FOCUSES, ENTRY_FORMATS } from "@/lib/logbook/entry-format";
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
    // El número de la entrada (#27). Lo pone `createEntry` al crear, así un
    // borrador reserva el suyo desde el principio. Las notas que existían
    // antes de esta columna se numeraron por fecha de publicación.
    number: integer().notNull(),
    // "un pensamiento", "un update", "una línea"… Los códigos y sus etiquetas
    // están en `entry-format.ts`. Opcional: las notas anteriores no lo tienen
    // y no se inventa.
    format: text({ enum: ENTRY_FORMATS }),
    // TODO: borrar. Lo reemplaza el encuadre de abajo; queda mientras el
    // código desplegado antes de esta migración pueda seguir leyéndolo.
    coverFocus: text("cover_focus", { enum: COVER_FOCUSES })
      .default("center")
      .notNull(),
    // El encuadre de la portada en la tarjeta 2:1: un punto de la foto (0 a 1)
    // y un zoom (1 a 4). Las cuentas están en `src/lib/logbook/cover-crop.ts`.
    coverCropX: real("cover_crop_x").default(0.5).notNull(),
    coverCropY: real("cover_crop_y").default(0.5).notNull(),
    coverZoom: real("cover_zoom").default(1).notNull(),
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
    // Dos notas no pueden compartir número. Además de la regla, protege a
    // `createEntry`, que calcula el siguiente como máximo + 1: si dos altas
    // calcularan el mismo, la segunda falla en vez de duplicarlo.
    uniqueIndex("logbook_entries_number_key").on(table.number),

    check(
      "logbook_entries_status_check",
      sql`status = ANY (ARRAY['draft'::text, 'published'::text])`,
    ),

    // Un slug vacío produciría `/logbook/`, que es el listado. La validación de
    // zod es la barrera principal, pero esto lo hace imposible incluso desde
    // psql.
    check("logbook_entries_slug_not_empty", sql`length(slug) > 0`),
    check("logbook_entries_number_positive", sql`number > 0`),

    // Igual que `status`: el enum de Drizzle solo existe en TypeScript, el
    // check lo hace cumplir también en la base.
    check(
      "logbook_entries_format_check",
      sql`format IS NULL OR format = ANY (ARRAY['thought'::text, 'update'::text, 'one-liner'::text, 'project'::text, 'how-to'::text])`,
    ),
    check(
      "logbook_entries_cover_focus_check",
      sql`cover_focus = ANY (ARRAY['top'::text, 'center'::text, 'bottom'::text])`,
    ),
    check(
      "logbook_entries_cover_crop_check",
      sql`cover_crop_x BETWEEN 0 AND 1 AND cover_crop_y BETWEEN 0 AND 1 AND cover_zoom BETWEEN 1 AND 4`,
    ),

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

/**
 * Los invitados del cumpleaños (`/cumple/<token>`).
 *
 * El token **es** la identidad: no hay cuenta, clave ni cookie. Quien tiene el
 * link es el invitado. Por eso es único, largo y sale de
 * `src/lib/birthday/token.ts`, y regenerarlo deja muerto el anterior.
 *
 * Los planes no viven acá sino en `src/lib/birthday/events.ts`; esta tabla
 * guarda solo lo que generan las personas.
 */
export const birthdayGuests = pgTable(
  "birthday_guests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    token: text().notNull(),
    // El mensaje que Joaquín le escribe a cada uno. Opcional: el saludo
    // funciona sin él.
    personalMessage: text("personal_message"),
    // Para armar el link de WhatsApp desde el panel. Opcional: el link también
    // se puede copiar a mano.
    phone: text(),
    // Qué planes ve. Un plan que no está acá no existe para el invitado: no
    // aparece ni bloqueado, y la API rechaza responderlo. Reemplaza a los
    // cupos, que a Joaquín le parecen poco respetuosos.
    invitedEvents: text("invited_events", { enum: EVENT_SLUGS })
      .array()
      .notNull()
      .default(sql.raw(`'{${DEFAULT_INVITED_EVENTS.join(",")}}'::text[]`)),
    // Los trazos de su roki (ver `roki.ts`). `null` mientras no dibuje: en la
    // pila aparece un roki genérico en el color del plan.
    roki: jsonb().$type<Roki>(),
    // Cuándo raspó su invitación. En la base y no en `localStorage`, porque el
    // navegador interno de WhatsApp no siempre conserva el almacenamiento y el
    // invitado tendría que raspar cada vez.
    scratchedAt: timestamp("scratched_at", {
      withTimezone: true,
      mode: "string",
    }),
    // Para el panel: quién abrió su link y cuándo volvió por última vez.
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("birthday_guests_token_key").on(table.token),
    check("birthday_guests_name_not_empty", sql`length(trim(name)) > 0`),
    // El mismo formato que valida `token.ts`. Un token corto o con otros
    // caracteres sería más fácil de adivinar.
    check("birthday_guests_token_format", sql`token ~ '^[0-9A-Za-z]{12}$'`),
    // Igual que el check de ejercicios: el enum de Drizzle solo existe en
    // TypeScript y esto lo hace cumplir en la base. Un invitado sin planes no
    // tiene nada que ver en su página.
    check(
      "birthday_guests_invited_events_check",
      sql`invited_events <@ ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text] AND cardinality(invited_events) > 0`,
    ),
    // Nada se lee con la anon key: la página y el panel van por Drizzle desde
    // el servidor. Sin política para `anon`, la tabla queda cerrada al browser.
    pgPolicy("service role full access to birthday guests", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type BirthdayGuest = typeof birthdayGuests.$inferSelect;
export type NewBirthdayGuest = typeof birthdayGuests.$inferInsert;

/**
 * Las respuestas: una fila por invitado y plan. **Sin fila es sin responder**,
 * así que "sin responder" no es un estado que haya que guardar ni que pueda
 * quedar desalineado.
 */
export const birthdayRsvps = pgTable(
  "birthday_rsvps",
  {
    guestId: uuid("guest_id")
      .notNull()
      .references(() => birthdayGuests.id, { onDelete: "cascade" }),
    eventSlug: text("event_slug", { enum: EVENT_SLUGS }).notNull(),
    status: text({ enum: ["going", "not_going"] }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Una respuesta por plan: cambiar de opinión actualiza la fila.
    primaryKey({ columns: [table.guestId, table.eventSlug] }),
    check(
      "birthday_rsvps_event_slug_check",
      sql`event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])`,
    ),
    check(
      "birthday_rsvps_status_check",
      sql`status = ANY (ARRAY['going'::text, 'not_going'::text])`,
    ),
    // La pila de un plan consulta por plan, no por invitado.
    index("birthday_rsvps_event_slug_idx").on(table.eventSlug),
    pgPolicy("service role full access to birthday rsvps", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type BirthdayRsvp = typeof birthdayRsvps.$inferSelect;
export type RsvpStatus = BirthdayRsvp["status"];

/**
 * El álbum de fotos de cada plan. Lo pega Joaquín desde el panel después del
 * plan, por eso vive en la base y no en `events.ts`: no debería hacer falta una
 * PR para compartir fotos.
 */
export const birthdayEventAlbums = pgTable(
  "birthday_event_albums",
  {
    eventSlug: text("event_slug", { enum: EVENT_SLUGS }).primaryKey().notNull(),
    url: text().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  () => [
    check(
      "birthday_event_albums_event_slug_check",
      sql`event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])`,
    ),
    // Solo https: el link se muestra como botón en la página de cada invitado,
    // y un `javascript:` ahí sería un link que ejecuta código.
    check("birthday_event_albums_url_https", sql`url LIKE 'https://%'`),
    pgPolicy("service role full access to birthday event albums", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type BirthdayEventAlbum = typeof birthdayEventAlbums.$inferSelect;

/**
 * Los textos de un plan que Joaquín corrige desde el panel: la pregunta del
 * voy / no voy y los datos ("¿dónde nos juntamos?", "nivel"…). Sin fila, el
 * plan usa los textos de `src/lib/birthday/events.ts`; con fila, estos los
 * reemplazan enteros.
 *
 * Horas, color y ruta siguen en código: de ellos dependen la semana, "ya
 * pasó" y las imágenes para guardar, y no se cambian a pocos días del plan.
 */
export const birthdayEventTexts = pgTable(
  "birthday_event_texts",
  {
    eventSlug: text("event_slug", { enum: EVENT_SLUGS }).primaryKey().notNull(),
    question: text().notNull(),
    details: jsonb().$type<EventDetail[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  () => [
    check(
      "birthday_event_texts_event_slug_check",
      sql`event_slug = ANY (ARRAY['cocktail'::text, 'run'::text, 'party'::text, 'hike'::text])`,
    ),
    check(
      "birthday_event_texts_details_array",
      sql`jsonb_typeof(details) = 'array'`,
    ),
    pgPolicy("service role full access to birthday event texts", {
      as: "permissive",
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export type BirthdayEventTexts = typeof birthdayEventTexts.$inferSelect;
