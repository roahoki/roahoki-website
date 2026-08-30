import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  connectTestDb,
  hasTestDatabase,
  resetTestDb,
  testDatabaseUrl,
} from "@/test/db";
import { EXERCISE_SLUGS } from "./exercises";

/**
 * Integración contra Postgres real.
 *
 * Lo que se prueba de verdad son dos cosas que un mock no podría demostrar
 * porque son justamente lo que tendría que simular: que el filtro por rango
 * deja afuera la semana anterior —de eso depende que el contador "se reinicie"
 * el lunes, ya que no hay ningún reinicio— y que el total público nunca queda
 * negativo.
 *
 * Mismo montaje que `src/lib/logbook/queries.test.ts`: `@/db` lee
 * `DATABASE_URL` al importarse, así que hay que apuntarla a la base de pruebas
 * **antes** de importar el módulo. De ahí el import dinámico.
 */
type Queries = typeof import("./queries");
type GetDb = typeof import("@/db").getDb;

let queries: Queries;
let getDb: GetDb;

// Lunes 24 de agosto de 2026, 00:00 UTC: el arranque de la semana de
// referencia. Todos los instantes de abajo se leen relativos a este.
const LUNES = "2026-08-24T00:00:00.000Z";
const MIERCOLES = "2026-08-26T18:00:00.000Z";
const DOMINGO_TARDE = "2026-08-30T23:59:59.999Z";
const LUNES_SIGUIENTE = "2026-08-31T00:00:00.000Z";
const DOMINGO_ANTERIOR = "2026-08-23T23:59:59.999Z";

describe.skipIf(!hasTestDatabase)("queries de los contadores", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await resetTestDb();

    queries = await import("./queries");
    getDb = (await import("@/db")).getDb;
  }, 60_000);

  afterAll(async () => {
    // Sin cerrar el pool, vitest se queda esperando a que el socket muera.
    await getDb().$client.end();
  });

  beforeEach(async () => {
    // Cada test parte de una tabla vacía: todos afirman sobre totales, y un
    // evento que sobreviva de otro test se suma silenciosamente al resultado.
    const sql = connectTestDb();
    try {
      await sql`delete from exercise_counter_events`;
    } finally {
      await sql.end();
    }
  });

  /** Inserta un evento fechado a mano, saltándose la validación de `recordEvent`. */
  async function seed(exercise: string, delta: number, createdAt: string) {
    const sql = connectTestDb();
    try {
      await sql`
        insert into exercise_counter_events (exercise, delta, created_at)
        values (${exercise}, ${delta}, ${createdAt})
      `;
    } finally {
      await sql.end();
    }
  }

  async function countEvents(): Promise<number> {
    const sql = connectTestDb();
    try {
      const [row] = await sql<{ total: number }[]>`
        select count(*)::int as total from exercise_counter_events
      `;
      return row.total;
    } finally {
      await sql.end();
    }
  }

  describe("currentWeekTotals", () => {
    it("devuelve los seis ejercicios en cero cuando no hay nada", async () => {
      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      // Todos presentes, no solo los que tienen filas: la vista no debería
      // tener que decidir qué hacer con una clave ausente.
      expect(Object.keys(totals).sort()).toEqual([...EXERCISE_SLUGS].sort());
      expect(Object.values(totals).every((total) => total === 0)).toBe(true);
    });

    it("suma los eventos de cada ejercicio por separado", async () => {
      await seed("pull_ups", 1, MIERCOLES);
      await seed("pull_ups", 1, MIERCOLES);
      await seed("squats", 1, MIERCOLES);

      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      expect(totals.pull_ups).toBe(2);
      expect(totals.squats).toBe(1);
      expect(totals.dips).toBe(0);
    });

    it("resta los eventos negativos", async () => {
      // El "−" del panel inserta un evento negativo en vez de borrar el
      // positivo: así el historial sigue contando lo que realmente pasó.
      await seed("push_ups", 10, MIERCOLES);
      await seed("push_ups", -1, MIERCOLES);

      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      expect(totals.push_ups).toBe(9);
    });

    /**
     * El comportamiento central de la feature: el lunes el contador arranca en
     * cero. No porque algo lo reinicie, sino porque la ventana se movió.
     */
    it("no cuenta los eventos de la semana anterior", async () => {
      await seed("pull_ups", 50, DOMINGO_ANTERIOR);

      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      expect(totals.pull_ups).toBe(0);
      // Y sin embargo la fila sigue ahí, que es de lo que después salen las
      // estadísticas. Un contador mutable la habría destruido al reiniciarse.
      expect(await countEvents()).toBe(1);
    });

    it("no cuenta los eventos de la semana siguiente", async () => {
      await seed("pull_ups", 50, LUNES_SIGUIENTE);

      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      expect(totals.pull_ups).toBe(0);
    });

    it("incluye el lunes a las 00:00 y el último instante del domingo", async () => {
      // Los dos bordes del rango semiabierto. Si el inicio fuera exclusivo, un
      // tap del lunes a medianoche no contaría en ninguna semana.
      await seed("dips", 1, LUNES);
      await seed("dips", 1, DOMINGO_TARDE);

      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      expect(totals.dips).toBe(2);
    });

    it("el lunes siguiente ya no ve nada de la semana que pasó", async () => {
      await seed("squats", 100, MIERCOLES);
      await seed("squats", 20, DOMINGO_TARDE);

      const totals = await queries.currentWeekTotals(new Date(LUNES_SIGUIENTE));

      expect(totals.squats).toBe(0);
    });
  });

  describe("totalsInRange", () => {
    it("suma sobre cualquier rango, no solo sobre una semana", async () => {
      // La semana es lo único que se muestra hoy, pero el acumulado del mes es
      // esta misma función con otras dos fechas.
      await seed("pull_ups", 10, DOMINGO_ANTERIOR);
      await seed("pull_ups", 5, MIERCOLES);

      const totals = await queries.totalsInRange({
        start: new Date("2026-08-01T00:00:00.000Z"),
        end: new Date("2026-09-01T00:00:00.000Z"),
      });

      expect(totals.pull_ups).toBe(15);
    });
  });

  describe("recordEvent", () => {
    it("guarda el evento y lo devuelve", async () => {
      const event = await queries.recordEvent(
        "pull_ups",
        1,
        new Date(MIERCOLES),
      );

      expect(event?.exercise).toBe("pull_ups");
      expect(event?.delta).toBe(1);
    });

    it("fecha la fila con el instante que recibe, no con el reloj de la base", async () => {
      // Si `created_at` tomara el `now()` de Postgres, un tap validado contra
      // la semana que termina podría insertarse en la que empieza.
      const event = await queries.recordEvent(
        "pull_ups",
        1,
        new Date(MIERCOLES),
      );

      expect(new Date(event?.createdAt ?? 0).toISOString()).toBe(MIERCOLES);
    });

    it("el evento queda contado en el total de la semana", async () => {
      await queries.recordEvent("dips", 1, new Date(MIERCOLES));
      await queries.recordEvent("dips", 1, new Date(MIERCOLES));

      const totals = await queries.currentWeekTotals(new Date(MIERCOLES));

      expect(totals.dips).toBe(2);
    });

    it("permite restar mientras quede algo que restar", async () => {
      await seed("squats", 2, MIERCOLES);

      const event = await queries.recordEvent(
        "squats",
        -1,
        new Date(MIERCOLES),
      );

      expect(event).toBeDefined();
      expect(
        (await queries.currentWeekTotals(new Date(MIERCOLES))).squats,
      ).toBe(1);
    });

    it("permite bajar hasta cero exacto", async () => {
      await seed("squats", 1, MIERCOLES);

      const event = await queries.recordEvent(
        "squats",
        -1,
        new Date(MIERCOLES),
      );

      expect(event).toBeDefined();
      expect(
        (await queries.currentWeekTotals(new Date(MIERCOLES))).squats,
      ).toBe(0);
    });

    it("rechaza el decremento que dejaría la semana en negativo", async () => {
      // El "−" está para corregir un tap de más, no para restar de la nada: un
      // número negativo en la página pública no significaría nada.
      const event = await queries.recordEvent(
        "pull_ups",
        -1,
        new Date(MIERCOLES),
      );

      expect(event).toBeUndefined();
      // Y no deja rastro: rechazar guardando la fila igual sería lo mismo que
      // no rechazar, porque el total volvería a salir negativo.
      expect(await countEvents()).toBe(0);
    });

    it("mira el total del ejercicio, no el de todos", async () => {
      await seed("pull_ups", 10, MIERCOLES);

      const event = await queries.recordEvent(
        "squats",
        -1,
        new Date(MIERCOLES),
      );

      expect(event).toBeUndefined();
    });

    it("mira el total de la semana en curso, no el histórico", async () => {
      // 50 dominadas la semana pasada no habilitan restar esta semana: el
      // número que no puede quedar negativo es el que se muestra.
      await seed("pull_ups", 50, DOMINGO_ANTERIOR);

      const event = await queries.recordEvent(
        "pull_ups",
        -1,
        new Date(MIERCOLES),
      );

      expect(event).toBeUndefined();
    });
  });
});
