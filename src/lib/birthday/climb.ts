/**
 * La subida al Manquehue: el perfil del cerro y las cuentas para que el roki
 * siga el sendero con el dedo (Figma: invitado v3, "la cumbre").
 *
 * Todo vive en el `viewBox` del dibujo (358 × 230). El avance se mide de 0 (la
 * base) a 1 (la cumbre) a lo largo del sendero, no en línea recta: así el roki
 * sube por el cerro aunque el dedo se salga un poco.
 */

export type Point = readonly [x: number, y: number];

export const CLIMB_VIEWBOX = { width: 358, height: 230 } as const;

/** El perfil completo, copiado del vector de Figma (cumbre en 332, 30). */
export const PROFILE: readonly Point[] = [
  [0, 207],
  [29.8, 201],
  [59.7, 191.1],
  [89.5, 181.2],
  [114.4, 171.2],
  [139.2, 153.3],
  [164.1, 143.4],
  [188.9, 125.5],
  [213.8, 111.5],
  [238.7, 93.6],
  [260.5, 79.7],
  [283.4, 63.8],
  [303.3, 47.9],
  [320.2, 36],
  [332.1, 30],
  [344.1, 39.9],
  [358, 51.9],
];

/** El sendero: de la base a la cumbre. */
export const TRAIL: readonly Point[] = PROFILE.slice(0, 15);

/** Desde dónde se cuenta la altura y dónde termina. */
export const BASE_ALTITUDE = 880;
export const SUMMIT_ALTITUDE = 1638;

/** Cuánto hay que subir para dar el voy por hecho. */
export const SUMMIT_AT = 0.97;

const segments = TRAIL.slice(1).map((end, i) => {
  const start = TRAIL[i];
  return {
    start,
    end,
    length: Math.hypot(end[0] - start[0], end[1] - start[1]),
  };
});
const TOTAL = segments.reduce((sum, segment) => sum + segment.length, 0);

/** El punto del sendero a una fracción `t` del recorrido. */
export function pointAt(t: number): Point {
  let remaining = Math.min(1, Math.max(0, t)) * TOTAL;
  for (const { start, end, length } of segments) {
    if (remaining <= length) {
      const k = length === 0 ? 0 : remaining / length;
      return [
        start[0] + (end[0] - start[0]) * k,
        start[1] + (end[1] - start[1]) * k,
      ];
    }
    remaining -= length;
  }
  return TRAIL[TRAIL.length - 1];
}

/** La fracción del sendero más cercana a un punto (el dedo). */
export function progressAt([x, y]: Point): number {
  let best = { distance: Number.POSITIVE_INFINITY, t: 0 };
  let walked = 0;
  for (const { start, end, length } of segments) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const k =
      length === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((x - start[0]) * dx + (y - start[1]) * dy) / (length * length),
            ),
          );
    const px = start[0] + dx * k;
    const py = start[1] + dy * k;
    const distance = Math.hypot(x - px, y - py);
    if (distance < best.distance)
      best = { distance, t: (walked + k * length) / TOTAL };
    walked += length;
  }
  return best.t;
}

/** La altura a una fracción del sendero, redondeada al metro. */
export function altitudeAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return Math.round(
    BASE_ALTITUDE + clamped * (SUMMIT_ALTITUDE - BASE_ALTITUDE),
  );
}

const METERS = new Intl.NumberFormat("es-CL");

/** "1.214 m" */
export function formatAltitude(meters: number): string {
  return `${METERS.format(meters)} m`;
}

/** El sendero como `points` de SVG hasta una fracción `t`. */
export function trailUpTo(t: number): string {
  const end = pointAt(t);
  const target = Math.min(1, Math.max(0, t)) * TOTAL;
  const points: Point[] = [TRAIL[0]];
  let walked = 0;
  for (const { end: next, length } of segments) {
    if (walked + length >= target) break;
    points.push(next);
    walked += length;
  }
  points.push(end);
  return points.map(([px, py]) => `${px},${py}`).join(" ");
}
