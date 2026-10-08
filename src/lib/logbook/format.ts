/**
 * Formato de las fechas del logbook.
 *
 * Está acá y no inline en cada página para que el listado, el detalle y el
 * panel muestren lo mismo: con tres `toLocaleDateString` sueltos, basta que uno
 * lleve `year` y otro no para que la misma nota se vea distinta según dónde se
 * la mire.
 *
 * `timeZone: "UTC"` es deliberado. Sin fijarla, el servidor formatea en la zona
 * del servidor y el cliente en la del visitante: una nota publicada cerca de
 * medianoche sale con un día en el HTML del servidor y otro tras la
 * hidratación, y React reporta un error de hidratación.
 */
const FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatEntryDate(isoDate: string): string {
  return FORMATTER.format(new Date(isoDate));
}

const SHORT_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * La fecha corta de las tarjetas: "24 sept 2026". La tarjeta tiene poco ancho
 * y la fecha comparte línea con el número y el formato.
 */
export function formatEntryDateShort(isoDate: string): string {
  return SHORT_FORMATTER.format(new Date(isoDate));
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("es", {
  numeric: "auto",
  style: "short",
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 60 * 60],
  ["day", 60 * 60 * 24],
  ["week", 60 * 60 * 24 * 7],
  ["month", 60 * 60 * 24 * 30],
  ["year", 60 * 60 * 24 * 365],
];

/**
 * Cuánto pasó desde una fecha, para el panel: "hace 2 h", "ayer", "hace 3 d".
 * Sirve para ubicar un borrador ("¿este es el de anoche?"), no para fecharlo,
 * así que redondea a la unidad más grande que cabe. `now` es parámetro para
 * poder testearlo sin depender del reloj.
 */
export function formatTimeAgo(isoDate: string, now: Date = new Date()): string {
  const seconds = (new Date(isoDate).getTime() - now.getTime()) / 1000;
  if (Math.abs(seconds) < 60) return "recién";

  let [unit, size] = UNITS[0];
  for (const candidate of UNITS) {
    if (Math.abs(seconds) >= candidate[1]) [unit, size] = candidate;
  }
  return RELATIVE_FORMATTER.format(Math.round(seconds / size), unit);
}
