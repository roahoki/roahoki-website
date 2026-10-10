/**
 * Helpers puros del editor.
 *
 * Viven fuera del componente porque son la parte con lógica de verdad —cómo se
 * parsean los tags— y dentro de un componente solo se podrían probar
 * renderizando y simulando clicks. Lo del cursor y las imágenes lo resuelve
 * Tiptap.
 */

/**
 * Parsea lo que se escribe en "+ agregar": uno o varios tags separados por
 * coma, normalizados y sin repetidos.
 *
 * Se normaliza igual que en el esquema de zod —minúsculas y sin espacios— para
 * que lo que muestra el editor coincida con lo que va a guardarse. Si el editor
 * mostrara "Rails" y la base guardara "rails", cada recarga cambiaría el campo.
 */
export function parseTagsInput(input: string): string[] {
  const tags = input
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);

  return [...new Set(tags)];
}

/**
 * Lee un timestamp tal como llega de la base o de la API.
 *
 * Postgres lo entrega como "2026-10-03 12:00:00+00": con espacio y con el
 * offset sin minutos. Chrome lo entiende, pero Safari —el del celular— no, y
 * da una fecha inválida. Se lleva a ISO antes de parsear.
 */
export function parseTimestamp(value: string): Date {
  const iso = value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
  return new Date(iso);
}

/** El valor de un `<input type="date">`: "2026-10-07", en UTC como el sitio. */
export function toDateInput(value: string): string {
  return parseTimestamp(value).toISOString().slice(0, 10);
}

/**
 * Cambia el día de una fecha y conserva la hora.
 *
 * La hora importa: ordena las notas publicadas el mismo día. Si cambiar el día
 * la llevara a medianoche, una nota fechada al mismo día que otra quedaría
 * siempre antes que ella.
 */
export function withDate(value: string, date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = parseTimestamp(value);
  result.setUTCFullYear(year, month - 1, day);
  return result.toISOString();
}

/** Si dos fechas caen el mismo día, en UTC como el resto del sitio. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
