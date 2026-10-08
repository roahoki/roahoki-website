/**
 * Trazos del logo de roahoki, copiados de los SVG de la marca
 * (`~/Documentos/roahoki/referencias/logo`, generados por `scripts/export.py`).
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

/**
 * Figura y "roahoki" dibujado, separados por 46 unidades. La base de las
 * letras está en y = 160; el trazo de las letras equivale al trazo 32 de la
 * figura a la altura de la ascendente.
 */
export const LOGO_PATHS = [
  "M43.55 110.27C19.76 101.78 0.14 98.16 0.14 67.77C0.14 35.02 22.04 10.14 55.24 10.14C88.19 10.14 105.89 37.5 105.89 68.14C105.89 87.89 97.26 93.68 81.4 102.37L91.7 102.37C110.06 105.12 125.76 138.82 132.47 154.43",
  "M4.59 160C4.59 145.42 27.05 119.95 36.6 107.63",
  "M82.93 37.77C87.58 37.77 92.67 51.77 92.67 59.73C92.67 63.13 91.53 75.84 86.83 75.84C79.2 75.84 76.11 54.11 76.11 48.13C76.11 42.84 75.56 37.77 82.93 37.77Z",
  // r
  "M178.75 64L178.75 160",
  "M160.75 126C172.75 84 190.75 64 220.75 64",
  // o
  "M274.45 59.3C298.05 56.8 319.55 77.5 322.55 105.5C325.45 133.5 308.65 158.2 285.05 160.7C261.45 163.2 239.95 142.5 236.95 114.5C234.05 86.5 250.85 61.8 274.45 59.3Z",
  // a
  "M374.65 62.3C396.05 60 415.75 80 418.55 106.9C421.35 133.8 406.25 157.5 384.85 159.7C363.45 162 343.75 142 340.95 115.1C338.15 88.2 353.25 64.5 374.65 62.3Z",
  "M420.75 62L420.75 160",
  // h
  "M460.75 24L460.75 160",
  "M442.75 124C454.75 82 474.75 62 499.75 62C522.75 62 538.75 78 538.75 104L538.75 160",
  // o
  "M596.45 59.3C620.05 56.8 641.55 77.5 644.55 105.5C647.45 133.5 630.65 158.2 607.05 160.7C583.45 163.2 561.95 142.5 558.95 114.5C556.05 86.5 572.85 61.8 596.45 59.3Z",
  // k
  "M682.75 24L682.75 160",
  "M748.75 62C732.75 84 710.75 106 664.75 118",
  "M704.75 108C728.75 110 744.75 136 754.75 160",
  // i
  "M776.75 64L776.75 160",
  "M776.75 30L776.75 35",
] as const;

export const LOGO_STROKE = 9.5;

export const LOGO_VIEWBOX = {
  x: -5.61,
  y: 4.39,
  width: 788.11,
  height: 162.26,
} as const;

export type ViewBox = { x: number; y: number; width: number; height: number };

export function viewBoxAttr({ x, y, width, height }: ViewBox): string {
  return `${x} ${y} ${width} ${height}`;
}
