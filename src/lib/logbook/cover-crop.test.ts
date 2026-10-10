import { describe, expect, it } from "vitest";
import {
  clampCrop,
  coverCropStyle,
  cropRect,
  DEFAULT_COVER_CROP,
  MAX_COVER_ZOOM,
  panCrop,
  visibleFraction,
  zoomCrop,
} from "./cover-crop";

// Una foto de celular apaisada (4:3) y una vertical (3:4).
const LANDSCAPE = 4 / 3;
const PORTRAIT = 3 / 4;

const close = (value: number) => Math.round(value * 1e6) / 1e6;
const rounded = (rect: Record<string, number>) =>
  Object.fromEntries(Object.entries(rect).map(([k, v]) => [k, close(v)]));

describe("visibleFraction", () => {
  // Una 4:3 en una tarjeta 2:1 entra entera a lo ancho y se recorta arriba y
  // abajo: se ven 2/3 de su alto.
  it("una foto más alta que 2:1 se recorta arriba y abajo", () => {
    expect(rounded(visibleFraction(LANDSCAPE, 1))).toEqual({
      width: 1,
      height: close(2 / 3),
    });
  });

  it("una panorámica se recorta a los costados", () => {
    expect(rounded(visibleFraction(4, 1))).toEqual({ width: 0.5, height: 1 });
  });

  it("el zoom achica lo que se ve", () => {
    expect(rounded(visibleFraction(LANDSCAPE, 2))).toEqual({
      width: 0.5,
      height: close(1 / 3),
    });
  });
});

describe("cropRect", () => {
  it("el encuadre por defecto es el centro", () => {
    expect(rounded(cropRect(DEFAULT_COVER_CROP, LANDSCAPE))).toEqual({
      left: 0,
      top: close(1 / 6),
      width: 1,
      height: close(2 / 3),
    });
  });

  it("y = 0 muestra el borde de arriba", () => {
    expect(cropRect({ x: 0.5, y: 0, zoom: 1 }, PORTRAIT).top).toBe(0);
  });
});

describe("panCrop", () => {
  it("mueve el rectángulo y no lo deja salir de la foto", () => {
    const moved = panCrop(DEFAULT_COVER_CROP, LANDSCAPE, 0, -1);
    expect(moved).toEqual({ x: 0.5, y: 0, zoom: 1 });
  });

  // Sin zoom, una 4:3 entra entera a lo ancho: moverla de costado no cambia
  // nada, y el punto queda al centro.
  it("en un eje sin sobrante no hay nada que mover", () => {
    expect(panCrop(DEFAULT_COVER_CROP, LANDSCAPE, 0.3, 0).x).toBe(0.5);
  });

  it("con zoom sí se puede mover de costado", () => {
    const zoomed = { x: 0.5, y: 0.5, zoom: 2 };
    const moved = panCrop(zoomed, LANDSCAPE, 0.25, 0);
    expect(close(cropRect(moved, LANDSCAPE).left)).toBe(0.5);
    expect(moved.x).toBe(1);
  });
});

describe("zoomCrop", () => {
  it("con el ancla al centro, acerca sobre el centro", () => {
    const zoomed = zoomCrop(DEFAULT_COVER_CROP, LANDSCAPE, 2);
    expect(rounded(zoomed)).toEqual({ x: 0.5, y: 0.5, zoom: 2 });
  });

  // Lo que está bajo los dedos no se mueve: si se pellizca sobre el borde
  // izquierdo, el borde izquierdo sigue a la vista.
  it("deja quieto el punto que está bajo el ancla", () => {
    const zoomed = zoomCrop(DEFAULT_COVER_CROP, LANDSCAPE, 2, { x: 0, y: 0.5 });
    expect(cropRect(zoomed, LANDSCAPE).left).toBe(0);
  });

  it("no baja de 1 ni pasa del máximo", () => {
    expect(zoomCrop(DEFAULT_COVER_CROP, LANDSCAPE, 0.4).zoom).toBe(1);
    expect(zoomCrop(DEFAULT_COVER_CROP, LANDSCAPE, 99).zoom).toBe(
      MAX_COVER_ZOOM,
    );
  });
});

describe("coverCropStyle", () => {
  it("sin zoom es solo la posición", () => {
    expect(coverCropStyle({ x: 0.25, y: 0, zoom: 1 })).toEqual({
      objectPosition: "25% 0%",
    });
  });

  it("con zoom escala desde el mismo punto", () => {
    expect(coverCropStyle({ x: 0.5, y: 1, zoom: 1.5 })).toEqual({
      objectPosition: "50% 100%",
      transform: "scale(1.5)",
      transformOrigin: "50% 100%",
    });
  });
});

describe("clampCrop", () => {
  it("lleva un encuadre escrito a mano a valores válidos", () => {
    expect(clampCrop({ x: -1, y: 2, zoom: 10 })).toEqual({
      x: 0,
      y: 1,
      zoom: MAX_COVER_ZOOM,
    });
  });
});
