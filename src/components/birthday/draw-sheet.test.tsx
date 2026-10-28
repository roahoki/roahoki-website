import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Roki } from "@/lib/birthday/roki";
import { DrawSheet } from "./draw-sheet";

const PREVIOUS: Roki = {
  strokes: [
    {
      color: "#101610",
      points: [
        [0.2, 0.2],
        [0.8, 0.8],
      ],
    },
  ],
  eye: null,
};

// happy-dom no pinta: se reemplaza el contexto 2D por uno que anota qué se
// trazó. Un trazo con `Path2D` es el calco de roki; uno sin argumento, una
// línea a mano (el dibujo anterior).
let strokes: unknown[][] = [];

beforeEach(() => {
  strokes = [];
  vi.stubGlobal(
    "Path2D",
    class {
      constructor(public d: string) {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      new Proxy(
        {
          stroke: (...args: unknown[]) => strokes.push(args),
        },
        {
          get: (target, key) =>
            key in target ? target[key as "stroke"] : () => {},
          set: () => true,
        },
      ) as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function open(previous: Roki | null) {
  render(
    <DrawSheet
      open
      onOpenChange={vi.fn()}
      token="Ab3dEf6hIj9L"
      planTitle="trote"
      planColor="#C42B1C"
      previous={previous}
      onSaved={vi.fn()}
    />,
  );
  // El primer pintado espera un cuadro.
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

const calcoOfRoki = () => strokes.filter((args) => args.length === 1).length;
const handDrawn = () => strokes.filter((args) => args.length === 0).length;

describe("DrawSheet: el calco", () => {
  it("la primera vez ofrece roki o nada, y parte con roki", async () => {
    await open(null);
    expect(screen.getByRole("radio", { name: "roki" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "nada" })).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "tu dibujo" }),
    ).not.toBeInTheDocument();
    expect(calcoOfRoki()).toBeGreaterThan(0);
  });

  it("al redibujar parte con roki y se puede cambiar al dibujo anterior", async () => {
    await open(PREVIOUS);
    expect(screen.getByRole("radio", { name: "roki" })).toBeChecked();
    expect(calcoOfRoki()).toBeGreaterThan(0);
    expect(handDrawn()).toBe(0);

    strokes = [];
    fireEvent.click(screen.getByRole("radio", { name: "tu dibujo" }));
    await act(async () => {});
    expect(calcoOfRoki()).toBe(0);
    expect(handDrawn()).toBe(PREVIOUS.strokes.length);
  });

  it("sin calco no traza nada bajo el lienzo", async () => {
    await open(PREVIOUS);
    strokes = [];
    fireEvent.click(screen.getByRole("radio", { name: "nada" }));
    await act(async () => {});
    expect(strokes).toHaveLength(0);
  });
});
