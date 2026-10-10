/**
 * El ancho de una imagen del cuerpo de la nota.
 *
 * Se guarda en el fragmento de su URL: `![](…/foto.jpg#w=60)`. El cuerpo es
 * markdown y el render público no acepta HTML (ver `src/lib/markdown.tsx`), así
 * que un `<img width>` no es opción. El fragmento es markdown válido, el
 * navegador no lo manda al servidor y una nota sin él se ve como siempre.
 *
 * El número es un porcentaje del ancho completo de la imagen (el de la portada
 * en escritorio, el de la columna en móvil), no píxeles: así se achica en la
 * misma proporción en cualquier pantalla.
 */

/** Más chica que esto la imagen deja de leerse en un celular. */
export const MIN_IMAGE_WIDTH = 20;

/** Cerca del ancho completo se pega a él: un 98 % no se distingue y ensucia la URL. */
const SNAP_TO_FULL = 97;

const WIDTH_FRAGMENT = /#w=(\d{1,3})$/;

/**
 * Separa la URL de la imagen y su ancho. `width` es `null` cuando va a ancho
 * completo o el fragmento no es un ancho válido.
 */
export function parseImageSrc(src: string): {
  src: string;
  width: number | null;
} {
  const match = src.match(WIDTH_FRAGMENT);
  if (!match) return { src, width: null };

  const width = Number(match[1]);
  const valid = width >= MIN_IMAGE_WIDTH && width < 100;
  return { src: src.slice(0, match.index), width: valid ? width : null };
}

/** La URL con el ancho en el fragmento, o sin fragmento si va a ancho completo. */
export function withImageWidth(src: string, width: number | null): string {
  const base = parseImageSrc(src).src;
  return width === null ? base : `${base}#w=${width}`;
}

/**
 * Lleva el porcentaje que sale de arrastrar a uno que se puede guardar: entero,
 * dentro del rango, y `null` si quedó prácticamente a ancho completo.
 */
export function normalizeImageWidth(percent: number): number | null {
  const rounded = Math.round(percent);
  if (rounded >= SNAP_TO_FULL) return null;
  return Math.max(MIN_IMAGE_WIDTH, rounded);
}
