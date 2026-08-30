import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { type ExerciseCounterEvent, exerciseCounterEvents } from "@/db/schema";
import { EXERCISE_SLUGS, type ExerciseSlug } from "./exercises";
import { type DateRange, weekRangeAt } from "./week";

/**
 * Todo el acceso a `exercise_counter_events` pasa por acá.
 *
 * Este cliente conecta como dueño de la base y **se saltea RLS** (ver
 * `src/db/index.ts`), así que la política de la tabla no filtra nada de lo que
 * pase por este archivo. Acá eso no es un riesgo como en el logbook —no hay
 * nada privado que se pueda escapar, los contadores son públicos por
 * definición—, pero sí significa que la regla de "el total de la semana nunca
 * es negativo" no la sostiene la base: la sostiene `recordEvent`.
 */

/** Cuánto lleva cada ejercicio. Siempre trae los seis, incluso en cero. */
export type ExerciseTotals = Record<ExerciseSlug, number>;

/**
 * Un `SUM` agrupado solo devuelve los ejercicios que tienen filas. Partir de
 * los seis en cero es lo que evita que la vista tenga que decidir qué hacer con
 * una clave ausente: un ejercicio sin registrar vale 0, no `undefined`.
 */
function zeroedTotals(): ExerciseTotals {
  return Object.fromEntries(
    EXERCISE_SLUGS.map((slug) => [slug, 0]),
  ) as ExerciseTotals;
}

/**
 * Los totales dentro de un rango, sumando los eventos de cada ejercicio.
 *
 * Recibe el rango en vez de calcularlo: la semana es lo único que se muestra
 * hoy, pero el acumulado del mes —o el de un día suelto, para las estadísticas
 * de más adelante— es esta misma función con otras dos fechas.
 */
export async function totalsInRange(range: DateRange): Promise<ExerciseTotals> {
  const rows = await getDb()
    .select({
      exercise: exerciseCounterEvents.exercise,
      // `::int` porque `sum()` en Postgres devuelve numeric, y postgres.js
      // entrega los numeric como string para no perder precisión. Sin el cast
      // los totales llegarían como "12" y se concatenarían en vez de sumarse.
      total: sql<number>`coalesce(sum(${exerciseCounterEvents.delta}), 0)::int`,
    })
    .from(exerciseCounterEvents)
    .where(inRange(range))
    .groupBy(exerciseCounterEvents.exercise);

  const totals = zeroedTotals();
  for (const row of rows) {
    totals[row.exercise] = row.total;
  }
  return totals;
}

/** Lo que ve el visitante: del lunes 00:00 UTC al domingo 23:59 UTC. */
export async function currentWeekTotals(
  now: Date = new Date(),
): Promise<ExerciseTotals> {
  return totalsInRange(weekRangeAt(now));
}

/**
 * Registra un tap del panel. Devuelve el evento, o `undefined` si se rechazó.
 *
 * El único rechazo posible es un `−` que dejaría el total de la semana en
 * negativo. Ese botón existe para corregir un tap de más, no para restar de la
 * nada, y un número negativo en la página pública no significaría nada para
 * quien la mira.
 *
 * `now` se usa para las dos cosas —elegir la semana que se consulta y fechar la
 * fila— en lugar de dejar que `created_at` tome el `now()` de la base. Si cada
 * una usara su propio reloj, un tap en el borde exacto del lunes podría
 * validarse contra la semana que termina e insertarse en la que empieza, que es
 * justo el caso que este chequeo tiene que cubrir.
 *
 * Queda una carrera teórica entre el `select` y el `insert`: dos "−"
 * simultáneos sobre un total de 1 pasarían los dos y dejarían el total en -1.
 * No se blinda con un lock porque hace falta que dos taps del mismo ejercicio
 * caigan en el mismo milisegundo, y del otro lado hay una sola persona con un
 * solo celular.
 */
export async function recordEvent(
  exercise: ExerciseSlug,
  delta: number,
  now: Date = new Date(),
): Promise<ExerciseCounterEvent | undefined> {
  const range = weekRangeAt(now);

  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({
        total: sql<number>`coalesce(sum(${exerciseCounterEvents.delta}), 0)::int`,
      })
      .from(exerciseCounterEvents)
      .where(and(eq(exerciseCounterEvents.exercise, exercise), inRange(range)));

    if ((row?.total ?? 0) + delta < 0) return undefined;

    const [created] = await tx
      .insert(exerciseCounterEvents)
      .values({ exercise, delta, createdAt: now.toISOString() })
      .returning();

    return created;
  });
}

/**
 * El filtro de fechas, en un solo lugar.
 *
 * `gte` en el inicio y `lt` en el final: el rango es semiabierto (ver
 * `week.ts`). Escrito a mano en cada query, basta un `lte` de más para que un
 * evento del lunes a las 00:00 cuente en dos semanas.
 */
function inRange(range: DateRange) {
  return and(
    gte(exerciseCounterEvents.createdAt, range.start.toISOString()),
    lt(exerciseCounterEvents.createdAt, range.end.toISOString()),
  );
}
