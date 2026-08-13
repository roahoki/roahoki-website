import { defineConfig } from "drizzle-kit";

/**
 * Configuración de drizzle-kit: introspección y generación de migraciones.
 *
 * Usa `DIRECT_URL` y no `DATABASE_URL`. Son dos rutas distintas a la misma base:
 * `DATABASE_URL` va por el transaction pooler (6543), que la app necesita porque
 * corre serverless, pero que no soporta todo lo que hace una migración.
 * `DIRECT_URL` (5432) sí. Ver `project-guide/STACK.md` §6.2.
 *
 * Las variables se cargan desde `.env.local`; drizzle-kit no lo hace solo.
 */

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.DIRECT_URL;
if (!url) {
  throw new Error(
    "Falta DIRECT_URL en .env.local. Se obtiene del botón Connect del " +
      "dashboard de Supabase (Session pooler). Ver .env.example.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  // El esquema de la app vive en `public`; el resto son internos de Supabase
  // (auth, storage, realtime) y no deben entrar al repo ni a las migraciones.
  schemaFilter: ["public"],
  casing: "snake_case",
  verbose: true,
  strict: true,
});
