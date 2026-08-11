import { sql } from "drizzle-orm";
import {
  check,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
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
