/**
 * Trazos de la figura de roahoki, copiados de los SVG de la marca
 * (`~/Documentos/roahoki/referencias/logo`, generados por `scripts/export.py`).
 * El logo completo es esta figura al lado de la palabra en Bricolage (`logo.tsx`).
 *
 * Son trazos, no contornos: el grosor lo pone `strokeWidth` y por eso la misma
 * figura sirve para los tres grosores del brand book. Hombro izquierdo
 * original; la variación "hombro 1" sigue en evaluación y cambiarla es
 * reemplazar el segundo path de cada grupo.
 */

/** La figura sola, en las unidades del dibujo (477 × 539). */
export const MARK_PATHS = [
  // cabeza, remate derecho del cuello y hombro derecho
  "M156.5 360.3C71 329.8 0.5 316.8 0.5 207.6C0.5 89.9 79.2 0.5 198.5 0.5C316.9 0.5 380.5 98.8 380.5 208.9C380.5 279.9 349.5 300.7 292.5 331.9L329.5 331.9C395.5 341.8 451.9 462.9 476 519",
  // hombro izquierdo
  "M16.5 539C16.5 486.6 97.2 395.1 131.5 350.8",
  // ojo, dibujado a mano
  "M298 99.8C314.7 99.8 333 150.1 333 178.7C333 190.9 328.9 236.6 312 236.6C284.6 236.6 273.5 158.5 273.5 137C273.5 118 271.5 99.8 298 99.8Z",
] as const;

/**
 * Caja de la figura con margen para el trazo más grueso (32): así las tres
 * variantes ocupan exactamente el mismo espacio y cambiar de grosor no mueve
 * nada alrededor.
 */
export const MARK_VIEWBOX = {
  x: -17,
  y: -17,
  width: 511,
  height: 573,
} as const;

export type ViewBox = { x: number; y: number; width: number; height: number };

export function viewBoxAttr({ x, y, width, height }: ViewBox): string {
  return `${x} ${y} ${width} ${height}`;
}
