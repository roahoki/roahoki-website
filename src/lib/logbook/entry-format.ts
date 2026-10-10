/**
 * Formatos de una nota y foco de su portada.
 *
 * Los códigos van en inglés en la base, como el resto del código; las
 * etiquetas en español son lo que ve el visitante (brand book §7.4). Viven acá
 * y no en el esquema para que el esquema, zod y la UI lean la misma lista.
 */

export const ENTRY_FORMATS = [
  "thought",
  "update",
  "one-liner",
  "project",
  "how-to",
] as const;

export type EntryFormat = (typeof ENTRY_FORMATS)[number];

export const ENTRY_FORMAT_LABELS: Record<EntryFormat, string> = {
  thought: "un pensamiento",
  update: "un update",
  "one-liner": "una línea",
  project: "proyecto",
  "how-to": "cómo hacerlo fácil",
};

/**
 * Qué parte de la foto de portada se ve cuando la tarjeta la recorta a 2:1.
 * Se traduce a `object-position` al renderizar.
 */
export const COVER_FOCUSES = ["top", "center", "bottom"] as const;

export type CoverFocus = (typeof COVER_FOCUSES)[number];

export const COVER_FOCUS_LABELS: Record<CoverFocus, string> = {
  top: "arriba",
  center: "centro",
  bottom: "abajo",
};

/**
 * La clase de Tailwind de cada foco. Completas y no `object-${focus}`: Tailwind
 * solo genera las clases que encuentra escritas tal cual en el código.
 */
export const COVER_FOCUS_CLASS: Record<CoverFocus, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};
