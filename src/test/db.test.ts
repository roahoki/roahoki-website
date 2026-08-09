import { describe, expect, it } from "vitest";
import { connectTestDb, hasTestDatabase } from "./db";

/**
 * Verifica que la infraestructura de tests de integración funciona: que la base
 * de pruebas está arriba, responde y soporta lo que las próximas PRs necesitan.
 *
 * Sin `TEST_DATABASE_URL` la suite entera se salta. En CI la variable siempre
 * está definida, así que ahí estos tests corren de verdad.
 */
describe.skipIf(!hasTestDatabase)("base de datos de pruebas", () => {
  it("acepta conexiones y responde una query", async () => {
    const sql = connectTestDb();
    try {
      const [row] = await sql<{ ok: number }[]>`select 1 as ok`;
      expect(row.ok).toBe(1);
    } finally {
      await sql.end();
    }
  });

  it("corre una versión de Postgres compatible con Supabase", async () => {
    const sql = connectTestDb();
    try {
      // Con alias explícito: `show server_version` nombra la columna
      // `server_version`, y el tipo genérico de postgres.js no valida nada en
      // runtime, así que un nombre equivocado se manifiesta como undefined.
      const [row] = await sql<
        { version: string }[]
      >`select current_setting('server_version') as version`;

      const major = Number.parseInt(row.version, 10);
      expect(major).not.toBeNaN();
      // El Supabase de producción corre 17.6 (verificado contra el proyecto).
      // Probar sobre una mayor anterior no reproduce su comportamiento, así
      // que si este assert falla es señal de que el compose quedó desalineado.
      expect(major).toBeGreaterThanOrEqual(17);
    } finally {
      await sql.end();
    }
  });

  it("puede crear y destruir tablas", async () => {
    const sql = connectTestDb();
    try {
      await sql`create table if not exists smoke_check (id serial primary key)`;
      await sql`insert into smoke_check default values`;
      const [row] = await sql<
        { count: string }[]
      >`select count(*)::text as count from smoke_check`;
      expect(Number(row.count)).toBeGreaterThan(0);
    } finally {
      await sql`drop table if exists smoke_check`;
      await sql.end();
    }
  });

  it("tiene gen_random_uuid disponible para las migraciones", async () => {
    const sql = connectTestDb();
    try {
      const [row] = await sql<{ id: string }[]>`select gen_random_uuid() as id`;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    } finally {
      await sql.end();
    }
  });
});
