import { describe, expect, it } from "vitest";
import { detectEye, simplify } from "./drawing";
import type { RokiPoint, RokiStroke } from "./roki";

/** Un círculo de `steps` puntos, cerrado. */
function circle(cx: number, cy: number, r: number, steps = 24): RokiPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}
const stroke = (points: RokiPoint[]): RokiStroke => ({
  color: "#101610",
  points,
});

const head = stroke(circle(0.45, 0.4, 0.3, 60));
const shoulder = stroke([
  [0.2, 0.75],
  [0.1, 0.95],
]);

describe("detectEye", () => {
  it("encuentra el trazo chico y cerrado dentro de la cabeza", () => {
    const eye = stroke(circle(0.6, 0.35, 0.05));
    expect(detectEye([head, shoulder, eye])).toBe(2);
  });

  it("no confunde un hombro abierto con un ojo", () => {
    expect(detectEye([head, shoulder])).toBeNull();
  });

  it("ignora un círculo chico fuera de la cabeza", () => {
    const outside = stroke(circle(0.92, 0.92, 0.04));
    expect(detectEye([head, outside])).toBeNull();
  });

  it("ignora un trazo cerrado demasiado grande para ser ojo", () => {
    const big = stroke(circle(0.45, 0.42, 0.2));
    expect(detectEye([head, big])).toBeNull();
  });

  it("entre dos candidatos elige el más chico", () => {
    const cheek = stroke(circle(0.4, 0.5, 0.08));
    const eye = stroke(circle(0.6, 0.35, 0.04));
    expect(detectEye([head, cheek, eye])).toBe(2);
  });

  it("acepta un ojo que no cierra perfecto", () => {
    const open = stroke(circle(0.6, 0.35, 0.05).slice(0, 22));
    expect(detectEye([head, open])).toBe(1);
  });

  it("sin cabeza y ojo no hay nada que reconocer", () => {
    expect(detectEye([head])).toBeNull();
  });
});

describe("simplify", () => {
  it("redondea, recorta al lienzo y quita puntos pegados", () => {
    expect(
      simplify([
        [0.12345, 0.5],
        [0.1235, 0.5001],
        [1.2, -0.1],
      ]),
    ).toEqual([
      [0.123, 0.5],
      [1, 0],
    ]);
  });

  it("deja al menos dos puntos en un toque", () => {
    expect(
      simplify([
        [0.5, 0.5],
        [0.5, 0.5],
      ]),
    ).toEqual([
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
  });

  it("no pasa del tope de puntos y conserva el último", () => {
    const many = Array.from(
      { length: 2000 },
      (_, i) => [i / 2000, 0.5] as RokiPoint,
    );
    const out = simplify(many);
    expect(out.length).toBeLessThanOrEqual(400);
    expect(out[out.length - 1]).toEqual([1, 0.5]);
  });
});
