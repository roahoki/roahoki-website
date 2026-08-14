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
