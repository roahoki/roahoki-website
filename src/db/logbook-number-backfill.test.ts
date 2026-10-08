import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, hasTestDatabase, resetTestDb } from "@/test/db";

/**
 * La migración que numeró las notas que ya existían cuando apareció la columna
 * `number`. Corre una sola vez en producción, así que este test es la única
 * oportunidad de ver que ordena bien antes de que toque datos reales.
 *
 * La base de pruebas ya tiene todas las migraciones aplicadas, con `number`
 * obligatorio. Para ensayar el backfill se cargan notas con números
 * provisionales (100+) en un orden que no coincide con sus fechas, se ejecuta
 * el SQL del archivo tal cual y se mira cómo quedaron.
 */
describe.runIf(hasTestDatabase)("migración 0004: numerar por fecha", () => {
  const dir = join(process.cwd(), "drizzle");
  const file = readdirSync(dir).find((name) =>
    name.startsWith("0004_logbook_number_backfill"),
  );
  const backfill = readFileSync(join(dir, file ?? "no-existe"), "utf8");

  let numbers: Record<string, number>;

  beforeAll(async () => {
    await resetTestDb();
    const sql = connectTestDb();
    try {
      await sql`delete from logbook_entries`;
      const rows = [
        // slug, published_at, created_at, número provisional, estado
        ["tercera", "2026-08-11", "2026-08-01", 100, "published"],
        ["primera", "2026-01-05", "2026-01-05", 101, "published"],
        ["borrador", "2026-09-30", "2026-09-30", 102, "draft"],
        // Mismo día que "tercera": la desempata la fecha de creación.
        ["segunda", "2026-08-11", "2026-07-20", 103, "published"],
      ] as const;
      for (const [slug, publishedAt, createdAt, number, status] of rows) {
        await sql`insert into logbook_entries
          (slug, title, body_md, published_at, created_at, number, status)
          values (${slug}, ${slug}, 'x', ${publishedAt}, ${createdAt}, ${number}, ${status})`;
      }

      await sql.unsafe(backfill);

      const result = await sql<{ slug: string; number: number }[]>`
        select slug, number from logbook_entries`;
      numbers = Object.fromEntries(result.map((r) => [r.slug, r.number]));
    } finally {
      await sql.end();
    }
  }, 60_000);

  it("numera de la más vieja a la más nueva, de 1 en adelante y sin huecos", () => {
    expect(numbers.primera).toBe(1);
    expect(Object.values(numbers).sort()).toEqual([1, 2, 3, 4]);
  });

  it("desempata la misma fecha de publicación por fecha de creación", () => {
    expect(numbers.segunda).toBe(2);
    expect(numbers.tercera).toBe(3);
  });

  it("los borradores entran en la misma cuenta", () => {
    expect(numbers.borrador).toBe(4);
  });
});
