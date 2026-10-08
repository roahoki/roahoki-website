import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, type PaletteColor, palette } from "./palette";

const round = (n: number) => Math.round(n * 100) / 100;

describe("contrastRatio", () => {
  it("da 21 entre blanco y negro, y 1 entre un color y sí mismo", () => {
    expect(round(contrastRatio("#FFFFFF", "#000000"))).toBe(21);
    expect(contrastRatio(palette.ink, palette.ink)).toBe(1);
  });

  it("no depende del orden", () => {
    expect(contrastRatio(palette.paper, palette.ink)).toBe(
      contrastRatio(palette.ink, palette.paper),
    );
  });

  it("rechaza lo que no sea #RRGGBB", () => {
    expect(() => contrastRatio("verde", palette.ink)).toThrow();
  });
});

// La tabla de contrastes del brand book (§5.3). Si cambia un color, el número
// de acá y el del brand book tienen que cambiar juntos.
describe("contrastes del brand book", () => {
  it.each<[string, PaletteColor, PaletteColor, number]>([
    ["texto sobre fondo", "ink", "paper", 15.51],
    ["fondo sobre botella", "paper", "bottle", 9.96],
    ["atenuado sobre fondo", "faded", "paper", 4.8],
    ["acento sobre fondo", "leaf", "paper", 4.79],
    ["acento contra texto", "leaf", "ink", 3.23],
    ["borde sobre fondo", "rule", "paper", 1.51],
    ["acento sobre botella", "leaf", "bottle", 2.08],
    ["texto sobre botella", "ink", "bottle", 1.56],
  ])("%s: %s / %s = %d", (_, a, b, expected) => {
    expect(round(contrastRatio(palette[a], palette[b]))).toBe(expected);
  });
});

describe("reglas de la paleta", () => {
  it("el cuerpo y la metadata pasan AA sobre el fondo", () => {
    for (const color of ["ink", "faded", "leaf"] as const) {
      expect(contrastRatio(palette[color], palette.paper)).toBeGreaterThan(4.5);
    }
  });

  // El link no lleva subrayado en reposo: tiene que distinguirse del texto
  // que lo rodea solo por el color.
  it("el acento se distingue del texto sin subrayado", () => {
    expect(contrastRatio(palette.leaf, palette.ink)).toBeGreaterThan(3);
  });

  it("sobre la botella solo pasa el fondo, y con AAA", () => {
    expect(contrastRatio(palette.paper, palette.bottle)).toBeGreaterThan(7);
    expect(contrastRatio(palette.leaf, palette.bottle)).toBeLessThan(4.5);
    expect(contrastRatio(palette.ink, palette.bottle)).toBeLessThan(4.5);
  });
});

describe("globals.css", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it.each(Object.entries(palette))(
    "declara --%s con el mismo valor que la paleta",
    (name, hex) => {
      const declared = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
      expect(declared?.[1].toUpperCase()).toBe(hex);
    },
  );
});
