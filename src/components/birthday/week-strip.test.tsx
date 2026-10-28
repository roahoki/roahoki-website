import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMotion } from "@/test/motion";
import { WeekStrip, type WeekStripDay } from "./week-strip";

const RUN = { path: "trote", title: "trote", color: "#C42B1C" };
const PARTY = { path: "carrete", title: "carrete", color: "#0E2A47" };
const HIKE = { path: "manquehue", title: "manquehue", color: "#3F2D5C" };

const DAYS: WeekStripDay[] = [
  { letter: "L", date: 2, plans: [] },
  { letter: "M", date: 3, plans: [] },
  { letter: "X", date: 4, plans: [] },
  { letter: "J", date: 5, plans: [] },
  { letter: "V", date: 6, plans: [] },
  { letter: "S", date: 7, plans: [RUN, PARTY] },
  { letter: "D", date: 8, plans: [HIKE] },
];

// happy-dom no calcula intersecciones: se disparan a mano.
let fire: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
const scrolled: string[] = [];

beforeEach(() => {
  scrolled.length = 0;
  document.body.innerHTML = "";
  for (const plan of [RUN, PARTY, HIKE]) {
    const section = document.createElement("section");
    section.id = plan.path;
    section.scrollIntoView = () => scrolled.push(plan.path);
    document.body.append(section);
  }
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
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

const day = (name: RegExp) => screen.getByRole("button", { name });

describe("WeekStrip", () => {
  it("muestra la semana y deja tocar solo los días con plan", () => {
    mockMotion(true);
    render(<WeekStrip days={DAYS} />);
    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(day(/lunes 2, sin plan/)).toBeDisabled();
    expect(day(/sábado 7: trote y carrete/)).toBeEnabled();
  });

  it("tocar un día baja a su plan; el sábado alterna entre sus dos", () => {
    mockMotion(true);
    render(<WeekStrip days={DAYS} />);
    fireEvent.click(day(/domingo 8/));
    expect(scrolled).toEqual(["manquehue"]);
    expect(window.location.hash).toBe("#manquehue");

    fireEvent.click(day(/sábado 7/));
    expect(scrolled.at(-1)).toBe("trote");
    // Ya en el trote, el mismo día lleva al carrete.
    act(() =>
      fire([
        {
          target: document.getElementById("trote") as Element,
          isIntersecting: true,
        },
      ]),
    );
    fireEvent.click(day(/sábado 7/));
    expect(scrolled.at(-1)).toBe("carrete");
  });

  it("marca el día del plan que se está viendo", () => {
    mockMotion(true);
    render(<WeekStrip days={DAYS} />);
    expect(day(/domingo 8/)).not.toHaveAttribute("aria-current");
    act(() =>
      fire([
        {
          target: document.getElementById("manquehue") as Element,
          isIntersecting: true,
        },
      ]),
    );
    expect(day(/domingo 8/)).toHaveAttribute("aria-current", "true");
    expect(day(/sábado 7/)).not.toHaveAttribute("aria-current");
  });
});
