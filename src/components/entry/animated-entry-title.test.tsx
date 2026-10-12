import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockElapsed, mockMotion } from "@/test/motion";
import { AnimatedEntryTitle } from "./animated-entry-title";

const TITLE = "Una nota con un título largo";

function renderTitle() {
  const { unmount } = render(<AnimatedEntryTitle>{TITLE}</AnimatedEntryTitle>);
  const title = screen.getByRole("heading", { level: 1 });
  return { title, unmount };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnimatedEntryTitle", () => {
  it("con movimiento reducido queda quieto, entero y sin estilos de GSAP", () => {
    mockMotion(false);
    const { title } = renderTitle();

    expect(title.style.visibility).toBe("");
    expect(title.childElementCount).toBe(0);
    expect(title).toHaveTextContent(TITLE);
  });

  it("con movimiento se muestra y se parte en líneas con su recorte", () => {
    mockMotion(true);
    mockElapsed(500);
    const { title } = renderTitle();

    expect(title.style.visibility).toBe("visible");
    expect(title.querySelector(".entry-title-line-mask")).not.toBeNull();
    // Partido en líneas, el título se sigue anunciando entero.
    expect(
      screen.getByRole("heading", { level: 1, name: TITLE }),
    ).toBeInTheDocument();
  });

  it("tarde, se muestra entero sin partirse", () => {
    mockMotion(true);
    mockElapsed(5000);
    const { title } = renderTitle();

    expect(title.style.visibility).toBe("visible");
    expect(title.childElementCount).toBe(0);
  });

  it("al desmontarse a mitad de camino, vuelve el texto original", () => {
    mockMotion(true);
    mockElapsed(500);
    const { title, unmount } = renderTitle();
    expect(title.childElementCount).toBeGreaterThan(0);

    unmount();

    expect(title.childElementCount).toBe(0);
    expect(title.textContent).toBe(TITLE);
  });
});
