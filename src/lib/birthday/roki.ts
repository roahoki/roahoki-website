/**
 * El roki que dibuja cada invitado.
 *
 * Se guarda como **trazos**, no como imagen: una lista de líneas con sus puntos
 * normalizados de 0 a 1 dentro del lienzo, y cuál de ellas es el ojo. Así se
 * dibuja a cualquier tamaño (la pila, la foto de curso, el panel) sin perder
 * calidad, pesa unos pocos KB y el ojo se puede animar por separado para que
 * parpadee.
 *
 * `eye` es `null` cuando no se reconoció un ojo: el roki entra igual, solo que
 * no parpadea.
 */

/** Los colores del lápiz, los mismos de la hoja de dibujo en Figma. */
export const ROKI_COLORS = [
  "#101610",
  "#173F2A",
  "#0E2A47",
  "#C42B1C",
  "#3F2D5C",
] as const;

export type RokiColor = (typeof ROKI_COLORS)[number];

export type RokiPoint = [x: number, y: number];

export type RokiStroke = {
  color: RokiColor;
  points: RokiPoint[];
};

export type Roki = {
  strokes: RokiStroke[];
  eye: number | null;
};

/** Topes del dibujo. Más que esto no es un roki sino un intento de llenar la base. */
export const MAX_STROKES = 40;
export const MAX_POINTS_PER_STROKE = 400;
