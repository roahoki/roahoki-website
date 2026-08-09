import postgres from "postgres";

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
