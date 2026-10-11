import { vi } from "vitest";

/**
 * Helpers para los tests de componentes con GSAP. Quien los use tiene que
 * llamar a `vi.restoreAllMocks()` en su `afterEach`.
 */

/** Simula la preferencia de movimiento del visitante. */
export function mockMotion(allowed: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("no-preference") ? allowed : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

/** Simula cuánto lleva cargando la página cuando el componente hidrata. */
export function mockElapsed(ms: number) {
  vi.spyOn(performance, "now").mockReturnValue(ms);
}
