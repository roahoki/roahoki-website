import { afterEach, describe, expect, it, vi } from "vitest";
import { mockElapsed } from "@/test/motion";
import { revealElapsedMs } from "./reveal";

/** Un elemento con las animaciones dadas corriendo. */
function elementWith(animations: Partial<CSSAnimation>[]) {
  const el = document.createElement("h1");
  el.getAnimations = () => animations as Animation[];
  return el;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("revealElapsedMs", () => {
  // Tras navegar desde el home la página lleva rato cargada, pero el título
  // recién entra: lo que cuenta es su respaldo, no la página.
  it("cuenta desde que arrancó el respaldo, no desde la carga", () => {
    mockElapsed(9000);
    const el = elementWith([
      { animationName: "motion-fallback-reveal", currentTime: 120 },
    ]);

    expect(revealElapsedMs(el)).toBe(120);
  });

  it("recién creado, sin tiempo todavía, cuenta como recién empezado", () => {
    mockElapsed(9000);
    const el = elementWith([
      { animationName: "motion-fallback-reveal", currentTime: null },
    ]);

    expect(revealElapsedMs(el)).toBe(0);
  });

  it("sin respaldo corriendo, cae en el tiempo de la página", () => {
    mockElapsed(9000);
    const el = elementWith([{ animationName: "otra", currentTime: 50 }]);

    expect(revealElapsedMs(el)).toBe(9000);
  });
});
