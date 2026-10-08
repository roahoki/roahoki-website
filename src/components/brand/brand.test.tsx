import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";
import { LogoMark, markStrokeForSize } from "./logo-mark";
import { LOGO_VIEWBOX, MARK_PATHS, MARK_VIEWBOX } from "./paths";

describe("markStrokeForSize", () => {
  // Los bordes del brand book: 32 hasta 48 px, 22 hasta 160 px, 14 sobre eso.
  it.each([
    [16, 32],
    [48, 32],
    [49, 22],
    [110, 22],
    [160, 22],
    [161, 14],
    [400, 14],
  ])("a %i px usa trazo %i", (size, stroke) => {
    expect(markStrokeForSize(size)).toBe(stroke);
  });
});

describe("LogoMark", () => {
  const svgOf = (ui: React.ReactElement) =>
    render(ui).container.querySelector("svg") as SVGSVGElement;

  it("usa el alto pedido y saca el ancho de la proporción de la figura", () => {
    const svg = svgOf(<LogoMark size={64} />);
    expect(svg).toHaveAttribute("height", "64");
    expect(Number(svg.getAttribute("width"))).toBeCloseTo(
      (64 * MARK_VIEWBOX.width) / MARK_VIEWBOX.height,
    );
  });

  it("elige el trazo según el tamaño", () => {
    expect(svgOf(<LogoMark size={24} />)).toHaveAttribute("stroke-width", "32");
    expect(svgOf(<LogoMark size={240} />)).toHaveAttribute(
      "stroke-width",
      "14",
    );
  });

  it("toma el color del texto que la rodea", () => {
    expect(svgOf(<LogoMark size={24} />)).toHaveAttribute(
      "stroke",
      "currentColor",
    );
  });

  it("sin título es decorativa", () => {
    const svg = svgOf(<LogoMark size={24} />);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("con título se anuncia", () => {
    const svg = svgOf(<LogoMark size={24} title="roahoki" />);
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "roahoki");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("reenvía className", () => {
    expect(svgOf(<LogoMark size={24} className="text-ink" />)).toHaveClass(
      "text-ink",
    );
  });
});

describe("Logo", () => {
  it("se anuncia como roahoki", () => {
    const svg = render(<Logo />).container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "roahoki");
  });

  it("saca el ancho del alto pedido", () => {
    const svg = render(<Logo height={30} />).container.querySelector("svg");
    expect(svg).toHaveAttribute("height", "30");
    expect(Number(svg?.getAttribute("width"))).toBeCloseTo(
      (30 * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height,
    );
  });
});

// El favicon es un archivo estático y no puede importar los trazos: si alguien
// redibuja la figura, este test avisa que falta actualizarlo.
describe("src/app/icon.svg", () => {
  const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");

  it.each(MARK_PATHS.map((d, i) => [i, d]))(
    "tiene el trazo %i de la figura",
    (_, d) => {
      expect(icon).toContain(`d="${d}"`);
    },
  );

  it("cambia a crema cuando el navegador está en oscuro", () => {
    expect(icon).toMatch(/prefers-color-scheme:\s*dark/);
  });
});
