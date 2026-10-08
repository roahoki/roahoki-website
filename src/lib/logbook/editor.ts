/**
 * Helpers puros del editor.
 *
 * Viven fuera del componente porque son la parte con lógica de verdad —cómo se
 * parsean los tags— y dentro de un componente solo se podrían probar
 * renderizando y simulando clicks. Lo del cursor y las imágenes lo resuelve
 * Tiptap.
 */

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
