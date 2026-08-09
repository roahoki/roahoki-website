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
 */

// En desarrollo, el hot reload de Next re-evalúa los módulos y crearía una
// conexión nueva en cada recarga hasta agotar el pool. Se cachea en globalThis.
const globalForDb = globalThis as unknown as {
  connection?: ReturnType<typeof postgres>;
};

function createConnection() {
  return postgres(databaseUrl(), {
    // pgbouncer en modo transaction no soporta prepared statements. Sin este
    // flag las queries fallan con errores que no dicen que la causa es el pooler.
    prepare: false,
    // El pooler ya multiplexa; abrir muchas conexiones desde cada instancia
    // serverless solo consume su cupo.
    max: 1,
  });
}

const connection = globalForDb.connection ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema, casing: "snake_case" });

export { schema };
