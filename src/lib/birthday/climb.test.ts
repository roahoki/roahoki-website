import { describe, expect, it } from "vitest";
import {
  altitudeAt,
  formatAltitude,
  pointAt,
  progressAt,
  SUMMIT_ALTITUDE,
  TRAIL,
  trailUpTo,
} from "./climb";

describe("la subida al Manquehue", () => {
  it("empieza en la base y termina en la cumbre", () => {
    expect(pointAt(0)).toEqual(TRAIL[0]);
    expect(pointAt(1)).toEqual(TRAIL[TRAIL.length - 1]);
  });

  it("encuentra en qué parte del sendero está el dedo", () => {
    expect(progressAt(TRAIL[0])).toBe(0);
    expect(progressAt(TRAIL[TRAIL.length - 1])).toBeCloseTo(1, 5);
    // Un poco fuera del sendero, igual cuenta donde está más cerca.
    const middle = pointAt(0.5);
    expect(progressAt([middle[0] + 4, middle[1] - 6])).toBeCloseTo(0.5, 1);
  });

  it("no pasa de la cumbre aunque el dedo siga a la derecha", () => {
    expect(progressAt([358, 60])).toBeLessThanOrEqual(1);
    expect(progressAt([358, 60])).toBeGreaterThan(0.95);
  });

  it("calcula la altura de la base a la cumbre", () => {
    expect(altitudeAt(0)).toBe(880);
    expect(altitudeAt(1)).toBe(SUMMIT_ALTITUDE);
    expect(formatAltitude(altitudeAt(1))).toBe("1.638 m");
  });

  it("dibuja el sendero recorrido hasta donde va el roki", () => {
    expect(trailUpTo(0).split(" ")).toHaveLength(2);
    expect(trailUpTo(1).split(" ").length).toBeGreaterThanOrEqual(TRAIL.length);
  });
});
