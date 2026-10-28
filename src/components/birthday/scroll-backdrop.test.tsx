import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { palette } from "@/lib/brand/palette";
import { mockMotion } from "@/test/motion";
import { ScrollBackdrop } from "./scroll-backdrop";

// happy-dom no calcula intersecciones: el doble guarda el callback para
// dispararlo a mano como si una zona cruzara la mitad de la pantalla.
let fire: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
const observed: Element[] = [];

beforeEach(() => {
  observed.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        fire = (entries) =>
          callback(
            entries as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver,
          );
      }
      observe(element: Element) {
        observed.push(element);
      }
      disconnect() {}
    },
  );
  document.head.innerHTML = `<meta name="theme-color" content="${palette.paper}">`;
  document.body.innerHTML = `
    <section data-backdrop="#C42B1C" id="trote"></section>
    <section data-backdrop="#0E2A47" id="carrete"></section>`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.removeAttribute("style");
});

const zone = (id: string) => document.getElementById(id) as HTMLElement;
const theme = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;

describe("ScrollBackdrop", () => {
  it("pinta la pantalla y la barra del navegador con el plan que se ve", () => {
    mockMotion(true);
    render(<ScrollBackdrop />);
    expect(observed).toHaveLength(2);

    fire([{ target: zone("trote"), isIntersecting: true }]);
    expect(document.body.style.backgroundColor).toBe("#C42B1C");
    expect(theme()).toBe("#C42B1C");

    fire([
      { target: zone("trote"), isIntersecting: false },
      { target: zone("carrete"), isIntersecting: true },
    ]);
    expect(document.body.style.backgroundColor).toBe("#0E2A47");
  });

  it("vuelve al papel arriba del primer plan", () => {
    mockMotion(true);
    render(<ScrollBackdrop />);
    fire([{ target: zone("trote"), isIntersecting: true }]);
    // El primer plan quedó bajo la mitad de la pantalla: se volvió a subir.
    vi.spyOn(zone("trote"), "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight,
    } as DOMRect);
    fire([{ target: zone("trote"), isIntersecting: false }]);
    expect(document.body.style.backgroundColor).toBe(palette.paper);
  });

  it("con movimiento reducido cambia sin transición y al salir deja todo como estaba", () => {
    mockMotion(false);
    const { unmount } = render(<ScrollBackdrop />);
    fire([{ target: zone("carrete"), isIntersecting: true }]);
    expect(document.body.style.transition).toBe("");
    unmount();
    expect(document.body.style.backgroundColor).toBe("");
    expect(theme()).toBe(palette.paper);
  });
});
