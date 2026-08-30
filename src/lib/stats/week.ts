/**
 * La ventana de tiempo que define "esta semana" para los contadores.
 *
 * No hay ningún reinicio: nada se borra ni se pone en cero, y no hay un cron
 * que pueda no correr. El número público es una suma sobre este rango, así que
 * el lunes a las 00:00 arranca en cero simplemente porque la ventana se movió y
 * las filas de la semana anterior quedaron fuera. El histórico sigue entero en
 * la base para las estadísticas que vengan después.
 *
 * Todo se calcula en **UTC**, igual que `src/lib/logbook/format.ts` y por la
 * misma razón: la página pública se renderiza en el servidor y se ve en el
 * browser del visitante. Si la semana dependiera de la zona horaria de quien
 * mira, dos personas verían números distintos del mismo dato, y cerca del
 * límite del lunes el HTML del servidor no coincidiría con lo que calcula el
 * cliente.
 */

/** Rango semiabierto: `start` incluido, `end` excluido. */
export type DateRange = {
  start: Date;
  end: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Cuántos días hay que retroceder desde cada día de la semana para llegar al
 * lunes. `getUTCDay()` devuelve 0 para el domingo, no 7, así que el domingo es
 * el que más retrocede: 6 días.
 */
const DAYS_SINCE_MONDAY = [6, 0, 1, 2, 3, 4, 5];

/**
 * La semana que contiene a `instant`: del lunes 00:00 UTC al lunes siguiente
 * 00:00 UTC.
 *
 * El final es el lunes siguiente y no "el domingo a las 23:59" a propósito. Con
 * un rango cerrado en 23:59 los eventos de los últimos 59 segundos del domingo
 * no caerían en ninguna semana: se perderían del contador sin dejar rastro. Un
 * rango semiabierto no deja ese hueco, y las dos semanas se tocan exactamente
 * en el instante del lunes a medianoche.
 */
export function weekRangeAt(instant: Date): DateRange {
  // Medianoche UTC del día de `instant`. Se reconstruye con `Date.UTC` en vez
  // de mutar la fecha recibida: `setUTCHours` modificaría el objeto del
  // llamador, que casi siempre es un `new Date()` compartido.
  const midnight = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
  );

  // Restar días en milisegundos es correcto acá justamente porque es UTC: no
  // hay horario de verano, así que todos los días duran 24 horas exactas.
  const start = new Date(
    midnight - DAYS_SINCE_MONDAY[instant.getUTCDay()] * MS_PER_DAY,
  );

  return { start, end: new Date(start.getTime() + 7 * MS_PER_DAY) };
}
