/**
 * Fechas del cumpleaños como las escribe el diseño: "sáb 7 nov · 09:00".
 *
 * `Intl` en `es-CL` agrega comas y "a. m." ("sáb, 7 nov, 09:00 a. m."), así que
 * se arma desde las partes. Siempre en hora de Santiago, se mire desde donde se
 * mire.
 */

const PARTS = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Santiago",
});

function parts(iso: string) {
  const map = Object.fromEntries(
    PARTS.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  const clean = (value = "") => value.replace(".", "").toLowerCase();
  return {
    weekday: clean(map.weekday),
    day: map.day,
    month: clean(map.month),
    time: `${map.hour}:${map.minute}`,
  };
}

/** "sáb 7 nov" */
export function formatDay(iso: string): string {
  const { weekday, day, month } = parts(iso);
  return `${weekday} ${day} ${month}`;
}

/** "sáb 7 nov · 09:00" */
export function formatDayTime(iso: string): string {
  return `${formatDay(iso)} · ${parts(iso).time}`;
}

/** "09:00" */
export function formatTime(iso: string): string {
  return parts(iso).time;
}

const LONG_DAY = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Santiago",
});

/**
 * "miércoles 4 de noviembre": la fecha sin abreviar, para la foto del cóctel
 * que va al grupo de la familia. `es-CL` la escribe con coma después del día
 * de la semana.
 */
export function formatLongDay(iso: string): string {
  return LONG_DAY.format(new Date(iso)).replace(",", "");
}
