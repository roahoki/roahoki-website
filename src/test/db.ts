import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Utilidades para los tests que necesitan un Postgres de verdad.
 *
 * La base sale de `TEST_DATABASE_URL`. Se levanta con:
 *
 *   docker compose -f docker-compose.test.yml up -d
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/roahoki_test npm test
 *
 * En CI la provee el `service` de Postgres del workflow.
 *
 * Si la variable no está, los tests de integración se saltan en vez de fallar:
 * quien solo toca lógica pura no necesita Docker corriendo para trabajar. En CI
 * siempre está definida, así que ahí nunca se saltan silenciosamente.
 */

export const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export const hasTestDatabase = Boolean(testDatabaseUrl);

/**
 * Abre una conexión a la base de pruebas. El llamador la cierra con `.end()`.
 *
 * `max: 1` porque los tests son secuenciales y un pool no aporta nada; una sola
 * conexión hace más predecible el orden de las transacciones.
 */
export function connectTestDb() {
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL no está definida. Levanta la base con " +
        "`docker compose -f docker-compose.test.yml up -d`.",
    );
  }
  return postgres(testDatabaseUrl, { max: 1, onnotice: () => {} });
}

/**
 * Deja la base de pruebas con el esquema aplicado desde cero.
 *
 * Antes de migrar crea los roles `anon` y `service_role`. En Supabase vienen
 * con el proyecto, pero un Postgres pelado no los tiene y las políticas de la
 * migración fallarían al referenciarlos.
 *
 * Borra y recrea el schema `public` para que cada corrida parta limpia y el
 * orden de los tests no importe.
 */
export async function resetTestDb() {
  const sql = connectTestDb();
  try {
    await sql`drop schema if exists public cascade`;
    await sql`create schema public`;
    await sql`drop table if exists drizzle.__drizzle_migrations`;

    // `create role` y `grant` no admiten parámetros, y dentro de un bloque
    // `do $$` el cuerpo es una cadena literal donde los binds tampoco llegan.
    // Se interpola, que es seguro acá: los nombres son constantes del código,
    // no entran por parámetro.
    for (const role of ["anon", "service_role"] as const) {
      const existing =
        await sql`select 1 from pg_roles where rolname = ${role}`;
      if (existing.length === 0) {
        await sql.unsafe(`create role "${role}" nologin`);
      }
      await sql.unsafe(`grant usage on schema public to "${role}"`);
    }

    await migrate(drizzle(sql, { schema, casing: "snake_case" }), {
      migrationsFolder: "./drizzle",
    });

    // Grants y RLS son dos capas distintas: sin permiso de tabla la consulta
    // se rechaza antes de que ninguna política llegue a evaluarse. Supabase le
    // da estos grants a `anon` y `service_role` de fábrica y deja que RLS haga
    // el filtrado fino, así que hay que reproducirlo para que los tests midan
    // las políticas y no la ausencia de permisos.
    await sql.unsafe(`
      grant select, insert, update, delete on all tables in schema public
        to anon, service_role
    `);
  } finally {
    await sql.end();
  }
}

/**
 * Ejecuta `fn` con el rol indicado, de modo que RLS sí se aplique.
 *
 * Es la única forma de probar las políticas: el usuario dueño de la base las
 * saltea siempre, así que un test que corra como `postgres` pasaría aunque la
 * política estuviera mal escrita. `set local` limita el cambio a la transacción.
 */
export async function asRole<T>(
  role: "anon" | "service_role",
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  const sql = connectTestDb();
  try {
    const result = await sql.begin(async (tx) => {
      await tx`select set_config('role', ${role}, true)`;
      return fn(tx as unknown as postgres.Sql);
    });
    // `begin` se tipa como `UnwrapPromiseArray<T>` para poder aplanar el caso
    // en que el callback devuelve un arreglo de queries. Con un `T` genérico
    // TypeScript no puede demostrar que equivale a `T`, y aquí sí lo es porque
    // `fn` devuelve una sola promesa.
    return result as T;
  } finally {
    await sql.end();
  }
}
