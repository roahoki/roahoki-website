import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

/**
 * Cliente de base de datos de la aplicación.
 *
 * Conecta por el transaction pooler (`DATABASE_URL`, puerto 6543) porque la app
 * corre serverless en Vercel: cada request puede levantar una instancia nueva, y
 * sin pooler se agotaría el límite de conexiones de Postgres. Ver
 * `project-guide/STACK.md` §3 y §6.2.
 *
 * Nota importante: este cliente **no pasa por RLS**. Conecta como el rol dueño
 * de la base, así que las políticas no lo filtran. La validación server-side es
 * la barrera; RLS queda como red de seguridad para lo que use la anon key desde
 * el browser.
 *
 * **La conexión se abre en la primera query, no al importar el módulo.** Antes
 * se creaba al evaluarlo, y eso rompía `next build`: el paso de *collect page
 * data* importa cada route handler, con lo cual el build pasaba a exigir
 * `DATABASE_URL` — una credencial de runtime que no tiene por qué estar
 * disponible al compilar. El deploy fallaba entero antes de servir un request.
 */

// En desarrollo, el hot reload de Next re-evalúa los módulos y crearía una
// conexión nueva en cada recarga hasta agotar el pool. Se cachea en globalThis.
const globalForDb = globalThis as unknown as {
  connection?: ReturnType<typeof postgres>;
};

type PostgresDatabase = ReturnType<typeof createDatabase>;

function createDatabase() {
  const connection =
    globalForDb.connection ??
    postgres(databaseUrl(), {
      // pgbouncer en modo transaction no soporta prepared statements. Sin este
      // flag las queries fallan con errores que no dicen que la causa es el
      // pooler.
      prepare: false,
      // El pooler ya multiplexa; abrir muchas conexiones desde cada instancia
      // serverless solo consume su cupo.
      max: 1,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.connection = connection;
  }

  return drizzle(connection, { schema, casing: "snake_case" });
}

/**
 * Devuelve el cliente, creándolo la primera vez que se lo pide.
 *
 * Todo acceso a datos entra por acá; nadie debería importar `postgres` ni
 * `drizzle` por su cuenta.
 */
let cached: PostgresDatabase | undefined;

export function getDb(): PostgresDatabase {
  cached ??= createDatabase();
  return cached;
}

export { schema };
