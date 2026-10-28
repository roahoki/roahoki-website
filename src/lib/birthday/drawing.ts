import {
  MAX_POINTS_PER_STROKE,
  MAX_STROKES,
  type RokiPoint,
  type RokiStroke,
} from "./roki";

/**
 * La lógica del dibujo del roki, separada del lienzo para poder probarla.
 *
 * El dibujo se hace en un solo paso: el ojo no se dibuja aparte, se reconoce.
 * Es el trazo **chico y cerrado** que queda **dentro de la cabeza**. Si no hay
 * ninguno así, el roki entra igual, solo que no parpadea.
 */

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function boxOf(points: RokiPoint[]): Box {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

const diagonal = (box: Box) =>
  Math.hypot(box.maxX - box.minX, box.maxY - box.minY);
const area = (box: Box) => (box.maxX - box.minX) * (box.maxY - box.minY);

function length(points: RokiPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  return total;
}

/** Cuánto puede medir un ojo, como fracción del lienzo. */
const MAX_EYE_SIZE = 0.3;

/**
 * El índice del trazo que es el ojo, o `null`.
 *
 * - **La cabeza** es el trazo más largo: es el contorno, y se dibuja de una.
 * - **Un candidato a ojo** es cerrado (termina cerca de donde empezó,
 *   relativo a su tamaño), es chico y su centro cae dentro de la caja de la
 *   cabeza.
 * - Entre varios candidatos gana el más chico: un ojo es lo más chico que se
 *   cierra adentro.
 */
export function detectEye(strokes: RokiStroke[]): number | null {
  if (strokes.length < 2) return null;

  const lengths = strokes.map((stroke) => length(stroke.points));
  const head = lengths.indexOf(Math.max(...lengths));
  const headBox = boxOf(strokes[head].points);

  let best: { index: number; size: number } | null = null;
  strokes.forEach((stroke, index) => {
    if (index === head || stroke.points.length < 4) return;
    const box = boxOf(stroke.points);
    const size = diagonal(box);
    if (size > MAX_EYE_SIZE || size < 0.01) return;

    const [first, last] = [
      stroke.points[0],
      stroke.points[stroke.points.length - 1],
    ];
    const gap = Math.hypot(first[0] - last[0], first[1] - last[1]);
    if (gap > Math.max(size * 0.45, 0.02)) return;

    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const inside =
      cx > headBox.minX &&
      cx < headBox.maxX &&
      cy > headBox.minY &&
      cy < headBox.maxY;
    if (!inside) return;

    if (!best || area(box) < best.size) best = { index, size: area(box) };
  });
  return best ? (best as { index: number }).index : null;
}

/**
 * Limpia un trazo antes de guardarlo: redondea a 3 decimales, quita puntos
 * pegados y, si quedan demasiados, se queda con uno de cada tantos. Un dedo
 * genera cientos de puntos por segundo y la mayoría no cambian nada.
 */
export function simplify(points: RokiPoint[]): RokiPoint[] {
  const rounded = points.map(
    ([x, y]) =>
      [
        Math.round(Math.min(1, Math.max(0, x)) * 1000) / 1000,
        Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000,
      ] as RokiPoint,
  );
  const kept: RokiPoint[] = [];
  for (const point of rounded) {
    const prev = kept[kept.length - 1];
    if (!prev || Math.hypot(point[0] - prev[0], point[1] - prev[1]) >= 0.004) {
      kept.push(point);
    }
  }
  const last = rounded[rounded.length - 1];
  if (kept.length === 1 && last) kept.push(last);
  if (kept.length <= MAX_POINTS_PER_STROKE) return kept;

  const step = Math.ceil(kept.length / MAX_POINTS_PER_STROKE);
  const thinned = kept.filter((_, index) => index % step === 0);
  thinned[thinned.length - 1] = kept[kept.length - 1];
  return thinned;
}

/** Si caben más trazos. */
export function canAddStroke(strokes: RokiStroke[]): boolean {
  return strokes.length < MAX_STROKES;
}
