import { beforeAll, describe, expect, it } from "vitest";
import { EXERCISE_SLUGS } from "@/lib/stats/exercises";
import { asRole, connectTestDb, hasTestDatabase, resetTestDb } from "@/test/db";

/**
 * Tests de integración del esquema de `exercise_counter_events`, contra
 * Postgres real.
 *
 * Igual que en `logbook-schema.test.ts`: una política RLS solo se demuestra
 * ejecutando una consulta con el rol al que aplica, y los checks son
 * comportamiento del motor, no de Drizzle. Un mock afirmaría sobre el mock.
 */
describe.runIf(hasTestDatabase)("esquema de exercise_counter_events", () => {
  beforeAll(async () => {
    await resetTestDb();
  });

  async function insertEvent(fields: Record<string, unknown> = {}) {
    const sql = connectTestDb();
    try {
      const row = { exercise: "pull_ups", delta: 1, ...fields };
      const [created] =
        await sql`insert into exercise_counter_events ${sql(row)}
        returning *`;
      return created;
    } finally {
      await sql.end();
    }
  }

  describe("columnas y defaults", () => {
    it("aplica los defaults de un evento mínimo", async () => {
      const event = await insertEvent();

      expect(event.id).toMatch(/^[\da-f-]{36}$/);
      expect(event.exercise).toBe("pull_ups");
      expect(event.delta).toBe(1);
      expect(event.created_at).not.toBeNull();
    });

    it("devuelve delta como número, no como string", async () => {
      // `integer` y no `numeric` a propósito: postgres.js entrega los numeric
      // como string para no perder precisión, y un total sumado sobre strings
      // se concatena en vez de sumarse.
      const event = await insertEvent({ delta: 5 });

      expect(typeof event.delta).toBe("number");
    });

    it("acepta un created_at explícito, para fechar un evento en el pasado", async () => {
      // `recordEvent` fecha la fila con el mismo instante que usó para elegir
      // la semana, en vez de dejar que la base ponga su `now()`.
      const event = await insertEvent({
        created_at: "2026-08-24T10:00:00.000Z",
      });

      expect(new Date(event.created_at).toISOString()).toBe(
        "2026-08-24T10:00:00.000Z",
      );
    });
  });

  describe("check del ejercicio", () => {
    /**
     * El guardián contra la desalineación entre el catálogo de TypeScript y el
     * `ARRAY[...]` escrito a mano en el esquema.
     *
     * Son dos listas separadas, como en `logbook_entries` con `status`. Agregar
     * un ejercicio a `EXERCISE_SLUGS` sin tocar el check hace que el panel
     * ofrezca un botón cuyo insert revienta contra la base; este test convierte
     * ese error de runtime en un test rojo.
     */
    it("acepta todos los slugs del catálogo de TypeScript", async () => {
      for (const slug of EXERCISE_SLUGS) {
        const event = await insertEvent({ exercise: slug });
        expect(event.exercise).toBe(slug);
      }
    });

    it("rechaza un ejercicio que no está en el catálogo", async () => {
      await expect(insertEvent({ exercise: "burpees" })).rejects.toThrow();
    });

    it("rechaza el string vacío", async () => {
      await expect(insertEvent({ exercise: "" })).rejects.toThrow();
    });
  });

  describe("check del delta", () => {
    it("acepta un incremento y un decremento", async () => {
      expect((await insertEvent({ delta: 1 })).delta).toBe(1);
      expect((await insertEvent({ delta: -1 })).delta).toBe(-1);
    });

    it("rechaza un delta de cero", async () => {
      // Una fila que no mueve ningún total es ruido en los datos de los que
      // después hay que sacar estadísticas.
      await expect(insertEvent({ delta: 0 })).rejects.toThrow();
    });

    it("rechaza un delta absurdo, en los dos sentidos", async () => {
      await expect(insertEvent({ delta: 1001 })).rejects.toThrow();
      await expect(insertEvent({ delta: -1001 })).rejects.toThrow();
    });

    it("acepta el borde de la cota", async () => {
      expect((await insertEvent({ delta: 1000 })).delta).toBe(1000);
      expect((await insertEvent({ delta: -1000 })).delta).toBe(-1000);
    });
  });

  /**
   * La tabla no tiene ninguna política para `anon`, y eso es lo que se afirma
   * acá.
   *
   * La página pública lee por Drizzle desde el servidor, así que `anon` no
   * necesita nada. Y una política de escritura para `anon` sería un problema
   * serio: la anon key viaja en el bundle del browser, con lo cual "cualquiera
   * con la anon key" es literalmente cualquiera, y podría inflar los números
   * que el sitio muestra como propios.
   */
  describe("RLS", () => {
    beforeAll(async () => {
      await insertEvent({ exercise: "squats", delta: 7 });
    });

    it("el rol anónimo no lee ningún evento", async () => {
      // Sin política de select, RLS no da error: filtra todo. Un `select` que
      // devuelve cero filas es exactamente el resultado esperado.
      const rows = await asRole(
        "anon",
        (sql) => sql`select id from exercise_counter_events`,
      );

      expect(rows).toHaveLength(0);
    });

    it("el rol anónimo no puede insertar", async () => {
      await expect(
        asRole(
          "anon",
          (sql) => sql`
            insert into exercise_counter_events (exercise, delta)
            values ('pull_ups', 1000)
          `,
        ),
      ).rejects.toThrow();
    });

    it("el rol anónimo no puede modificar un evento", async () => {
      await asRole(
        "anon",
        (sql) => sql`update exercise_counter_events set delta = 999`,
      );

      const sql = connectTestDb();
      try {
        const [row] = await sql`
          select count(*)::int as total from exercise_counter_events
          where delta = 999
        `;
        expect(row.total).toBe(0);
      } finally {
        await sql.end();
      }
    });

    it("el rol anónimo no puede borrar", async () => {
      const sql = connectTestDb();
      try {
        const [antes] = await sql`
          select count(*)::int as total from exercise_counter_events
        `;

        await asRole("anon", (s) => s`delete from exercise_counter_events`);

        const [despues] = await sql`
          select count(*)::int as total from exercise_counter_events
        `;
        expect(despues.total).toBe(antes.total);
      } finally {
        await sql.end();
      }
    });

    it("el service_role sí tiene acceso completo", async () => {
      const rows = await asRole(
        "service_role",
        (sql) => sql`select id from exercise_counter_events`,
      );

      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
