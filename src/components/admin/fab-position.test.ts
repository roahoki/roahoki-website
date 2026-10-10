import { afterEach, describe, expect, it } from "vitest";
import {
  clampFabPosition,
  DEFAULT_FAB_POSITION,
  dragFabPosition,
  FAB_SIZE,
  loadFabPosition,
  saveFabPosition,
} from "./fab-position";

const PHONE = { width: 390, height: 844 };

describe("clampFabPosition", () => {
  it("deja quieta una posición que entra", () => {
    expect(clampFabPosition({ right: 100, bottom: 200 }, PHONE)).toEqual({
      right: 100,
      bottom: 200,
    });
  });

  // Guardado en escritorio y abierto en el celular: no puede quedar afuera.
  it("trae de vuelta un botón que quedó fuera de la pantalla", () => {
    expect(clampFabPosition({ right: 1200, bottom: 900 }, PHONE)).toEqual({
      right: PHONE.width - FAB_SIZE - 8,
      bottom: PHONE.height - FAB_SIZE - 8,
    });
  });

  it("no lo pega al borde", () => {
    expect(clampFabPosition({ right: -40, bottom: 0 }, PHONE)).toEqual({
      right: 8,
      bottom: 8,
    });
  });
});

describe("dragFabPosition", () => {
  // Se mide desde abajo a la derecha: mover el dedo hacia arriba y a la
  // izquierda lo aleja de esa esquina.
  it("arrastrar hacia arriba a la izquierda aleja el botón de su esquina", () => {
    expect(
      dragFabPosition({ right: 20, bottom: 20 }, -100, -300, PHONE),
    ).toEqual({ right: 120, bottom: 320 });
  });
});

describe("posición guardada", () => {
  afterEach(() => window.localStorage.clear());

  it("sin nada guardado va a la esquina", () => {
    expect(loadFabPosition()).toEqual(DEFAULT_FAB_POSITION);
  });

  it("recuerda la última posición", () => {
    saveFabPosition({ right: 140, bottom: 300 });
    expect(loadFabPosition()).toEqual({ right: 140, bottom: 300 });
  });

  it("ignora lo que no es una posición", () => {
    window.localStorage.setItem("roahoki:admin-fab", '{"right":"x"}');
    expect(loadFabPosition()).toEqual(DEFAULT_FAB_POSITION);
  });
});
