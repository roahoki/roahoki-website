import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimatedLogo } from "./animated-logo";

/** Simula la preferencia de movimiento del visitante. */
function mockMotion(allowed: boolean) {
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

/** Simula cuánto lleva cargando la página cuando el logo hidrata. */
function mockElapsed(ms: number) {
  vi.spyOn(performance, "now").mockReturnValue(ms);
}

function renderLogo() {
  const { container } = render(
    <a href="/">
      <AnimatedLogo size={20} />
    </a>,
  );
  const root = container.querySelector("[data-motion=logo]") as HTMLElement;
  const word = container.querySelector("[data-logo-part=word]") as HTMLElement;
  return { root, word };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnimatedLogo", () => {
  it("con movimiento reducido queda quieto, entero y sin estilos de GSAP", () => {
    mockMotion(false);
    const { root, word } = renderLogo();

    expect(screen.getByRole("link", { name: "roahoki" })).toBeInTheDocument();
    expect(root.style.visibility).toBe("");
    expect(word.childElementCount).toBe(0);
    expect(word).toHaveTextContent("roahoki");
  });

  it("con movimiento se muestra y parte la palabra en letras para dibujarla", () => {
    mockMotion(true);
    mockElapsed(500);
    const { root, word } = renderLogo();

    expect(root.style.visibility).toBe("visible");
    expect(word.childElementCount).toBe("roahoki".length);
    // Las letras partidas siguen formando el nombre del link.
    expect(screen.getByRole("link", { name: "roahoki" })).toBeInTheDocument();
  });

  it("si el respaldo del CSS ya lo mostró, no lo vuelve a dibujar", () => {
    mockMotion(true);
    mockElapsed(5000);
    const { root, word } = renderLogo();

    expect(root.style.visibility).toBe("visible");
    expect(word.childElementCount).toBe(0);
  });

  it("al desmontarse devuelve el texto original", () => {
    mockMotion(true);
    mockElapsed(500);
    const { container, unmount } = render(<AnimatedLogo size={20} />);
    const word = container.querySelector(
      "[data-logo-part=word]",
    ) as HTMLElement;
    expect(word.childElementCount).toBe("roahoki".length);

    unmount();

    expect(word.childElementCount).toBe(0);
    expect(word.textContent).toBe("roahoki");
  });
});
