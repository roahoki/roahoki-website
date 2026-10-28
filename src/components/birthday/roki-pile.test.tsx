import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RokiPile } from "./roki-pile";

describe("RokiPile", () => {
  it("deja hacer scroll en el espacio vacío y solo agarra los rokis", () => {
    const { container } = render(
      <RokiPile
        attendees={[
          { id: "a", name: "cata", roki: null },
          { id: "b", name: "vale", roki: null },
        ]}
        meId="a"
        color="#C42B1C"
        height={300}
        onTapMine={vi.fn()}
      />,
    );
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.height).toBe("300px");
    // La caja no bloquea el gesto; cada roki sí, para poder arrastrarlo.
    expect(box.className).not.toContain("touch-none");
    const rokis = box.querySelectorAll("[data-roki]");
    expect(rokis).toHaveLength(2);
    for (const roki of rokis) expect(roki.className).toContain("touch-none");
  });
});
