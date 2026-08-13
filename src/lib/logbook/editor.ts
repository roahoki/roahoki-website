/**
 * Helpers puros del editor.
 *
 * Viven fuera del componente porque son la parte con lógica de verdad —dónde
 * cae el cursor después de insertar, cómo se parsean los tags— y dentro de un
 * componente solo se podrían probar renderizando y simulando clicks.
 */

export type TextSelection = { start: number; end: number };

export type InsertResult = {
  value: string;
  /** Dónde dejar el cursor después. Sin esto salta al final del textarea. */
  selection: TextSelection;
};

/**
 * Inserta texto en la posición del cursor, reemplazando lo que esté
 * seleccionado.
 *
 * Devuelve también dónde queda el cursor: el llamador tiene que reposicionarlo
 * a mano porque React reescribe el `value` del textarea y el browser manda el
 * cursor al final. Subir una imagen en medio de un párrafo y que el cursor
 * salte al final es exactamente la molestia que esto evita.
 */
export function insertAtCursor(
  value: string,
  insert: string,
  selection: TextSelection,
): InsertResult {
  const start = clamp(selection.start, 0, value.length);
  const end = clamp(selection.end, start, value.length);

  return {
    value: value.slice(0, start) + insert + value.slice(end),
    selection: {
      start: start + insert.length,
      end: start + insert.length,
    },
  };
}

/**
 * Inserta en una línea propia, agregando los saltos que falten.
 *
 * Es lo que se quiere al insertar una imagen: pegada al párrafo anterior,
 * markdown la trata como parte de ese párrafo en vez de como un bloque.
 */
export function insertAsBlock(
  value: string,
  insert: string,
  selection: TextSelection,
): InsertResult {
  const start = clamp(selection.start, 0, value.length);
  const before = value.slice(0, start);
  const after = value.slice(clamp(selection.end, start, value.length));

  const prefix =
    before === "" || before.endsWith("\n\n")
      ? ""
      : before.endsWith("\n")
        ? "\n"
        : "\n\n";
  const suffix =
    after === "" || after.startsWith("\n\n")
      ? ""
      : after.startsWith("\n")
        ? "\n"
        : "\n\n";

  return insertAtCursor(value, `${prefix}${insert}${suffix}`, {
    start,
    end: selection.end,
  });
}

/** El markdown de una imagen. `alt` vacío es válido y no rompe la sintaxis. */
export function imageMarkdown(url: string, alt = ""): string {
  return `![${alt}](${url})`;
}

/**
 * Parsea el campo de tags: separados por coma, normalizados y sin repetidos.
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

/** El inverso: los tags de vuelta al campo de texto. */
export function formatTagsInput(tags: readonly string[]): string {
  return tags.join(", ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
