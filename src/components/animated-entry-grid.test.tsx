import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockElapsed, mockMotion } from "@/test/motion";
import { AnimatedEntryGrid } from "./animated-entry-grid";

/** Dos tarjetas tipográficas, con el número en su span como en `EntryCard`. */
function renderGrid() {
  const { container, unmount } = render(
    <AnimatedEntryGrid>
      {[12, 7].map((n) => (
        <li key={n} data-motion="card">
          <p>
            #<span data-motion="count">{n}</span>
          </p>
        </li>
      ))}
    </AnimatedEntryGrid>,
  );
  const cards = Array.from(
    container.querySelectorAll<HTMLElement>("[data-motion=card]"),
  );
  const counters = cards.map(
    (card) => card.querySelector("[data-motion=count]") as HTMLElement,
  );
  return { cards, counters, unmount };
}

/** Deja la segunda tarjeta muy por debajo del borde de la pantalla. */
function mockSecondCardBelowFold() {
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const rect = original.call(this);
      if (this.querySelector?.("[data-motion=count]")?.textContent === "7") {
        return { ...rect, top: 5000, bottom: 5300 } as DOMRect;
      }
      return rect;
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnimatedEntryGrid", () => {
  it("con movimiento reducido deja las tarjetas quietas y los números reales", () => {
    mockMotion(false);
    const { cards, counters } = renderGrid();

    for (const card of cards) expect(card.getAttribute("style")).toBeNull();
    expect(counters.map((c) => c.textContent)).toEqual(["12", "7"]);
  });

  it("al cargar, las tarjetas arrancan abajo e invisibles y los números en cero", () => {
    mockMotion(true);
    mockElapsed(500);
    const { cards, counters } = renderGrid();

    for (const card of cards) {
      expect(card.style.visibility).toBe("visible");
      expect(card.style.opacity).toBe("0");
    }
    expect(counters.map((c) => c.textContent)).toEqual(["0", "0"]);
  });

  it("React puede seguir actualizando el número", () => {
    mockMotion(true);
    mockElapsed(500);
    const grid = (n: number) => (
      <AnimatedEntryGrid>
        <li data-motion="card">
          <span data-motion="count">{n}</span>
        </li>
      </AnimatedEntryGrid>
    );
    const { container, rerender } = render(grid(12));
    const counter = container.querySelector(
      "[data-motion=count]",
    ) as HTMLElement;
    expect(counter.textContent).toBe("0");

    // Una nota que cambia de número tras revalidar: el contador no se tiene
    // que quedar con el valor intermedio.
    rerender(grid(13));

    expect(counter.textContent).toBe("13");
  });

  it("tarde, lo que ya se ve queda quieto y lo de más abajo igual entra", () => {
    mockMotion(true);
    mockElapsed(5000);
    mockSecondCardBelowFold();
    const { cards, counters } = renderGrid();

    expect(cards[0].style.visibility).toBe("visible");
    expect(cards[0].style.opacity).toBe("");
    expect(counters[0].textContent).toBe("12");

    expect(cards[1].style.opacity).toBe("0");
    expect(counters[1].textContent).toBe("0");
  });

  it("al desmontarse a mitad de camino, los números vuelven a su valor", () => {
    mockMotion(true);
    mockElapsed(500);
    const { counters, unmount } = renderGrid();
    expect(counters[0].textContent).toBe("0");

    unmount();

    expect(counters.map((c) => c.textContent)).toEqual(["12", "7"]);
  });
});
