/**
 * Generación de slugs para las URLs del logbook.
 *
 * El slug es parte del contrato público: una vez que una nota se compartió por
 * un link, cambiarlo rompe ese link. Por eso se genera una vez al crear y
 * después se edita a mano si hace falta, en vez de derivarse del título en cada
 * guardado.
 */

/** Tope de largo. Un slug más largo que esto no aporta y ensucia el link. */
const MAX_LENGTH = 80;

/**
 * Convierte un texto en un slug: minúsculas, sin acentos, palabras con guión.
 *
 * `normalize("NFD")` descompone cada letra acentuada en la letra base más el
 * diacrítico, y el rango `\u0300-\u036f` —los "combining marks"— los borra. Es
 * lo que convierte "Programación" en "programacion" y no en "programaci-n".
 * También cubre la `ñ`, que en NFD es `n` + tilde combinante: "año" queda
 * "ano" y no "a-o".
 *
 * Devuelve `""` cuando no queda nada utilizable —por ejemplo, un título que es
 * solo emojis—. Quien llame decide qué hacer con eso; acá inventar un valor
 * escondería el caso.
 */
export function slugify(input: string): string {
  const withoutAccents = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return (
    withoutAccents
      .toLowerCase()
      // Todo lo que no sea letra ASCII o dígito pasa a ser separador. Incluye
      // emojis, signos y espacios, y colapsa las secuencias en un solo guión.
      .replace(/[^a-z\d]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_LENGTH)
      // El `slice` puede cortar justo sobre un guión y dejarlo colgando al final.
      .replace(/-+$/g, "")
  );
}

/**
 * Agrega un sufijo numérico hasta encontrar un slug libre.
 *
 * `taken` es el conjunto de slugs que ya existen. Se recibe en vez de
 * consultarse acá para que la función siga siendo pura y testeable: quien la
 * llama ya tiene que ir a la base de todos modos.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  // Arranca en 2 porque el que ya existe es, implícitamente, el 1.
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

/**
 * Si un texto ya es un slug válido.
 *
 * Sirve para validar el campo cuando se edita a mano en el editor: ahí el valor
 * no pasa por `slugify`, lo escribe una persona.
 */
export function isValidSlug(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_LENGTH &&
    /^[a-z\d]+(?:-[a-z\d]+)*$/.test(value)
  );
}
