import type { DateRange } from "./week";

/**
 * Cómo se escribe la semana que está corriendo.
 *
 * Está en su propio módulo porque la van a mostrar el panel y la página
 * pública, y son los dos lugares donde el visitante y yo tenemos que estar
 * mirando lo mismo. Con dos formateadores sueltos, basta que uno diga "24 al
 * 30" y el otro "24 al 31" para que el número parezca de otra semana.
 *
 * `timeZone: "UTC"` por lo mismo que en `src/lib/logbook/format.ts`: sin
 * fijarla, el servidor formatea en su zona y el browser en la del visitante, y
 * el texto cambia entre el HTML y la hidratación.
 */

const DAY = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  timeZone: "UTC",
});

const DAY_AND_MONTH = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * "24 al 30 de agosto", o "29 de junio al 5 de julio" cuando la semana cruza
 * de mes.
 *
 * El rango es semiabierto —termina el lunes a las 00:00— pero el día que se
 * muestra es el domingo, que es el último que cuenta. De ahí el milisegundo
 * que se resta: escribir el lunes correría la semana un día y contradiría al
 * contador que está justo al lado.
 */
export function formatWeekRange(range: DateRange): string {
  const lastDay = new Date(range.end.getTime() - 1);

  const sameMonth = range.start.getUTCMonth() === lastDay.getUTCMonth();

  return sameMonth
    ? `${DAY.format(range.start)} al ${DAY_AND_MONTH.format(lastDay)}`
    : `${DAY_AND_MONTH.format(range.start)} al ${DAY_AND_MONTH.format(lastDay)}`;
}
