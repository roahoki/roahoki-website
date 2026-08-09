import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AtipicusIcon } from "./atipicus-icon";
import { MestiIcon } from "./mesti-icon";
import { PlannisthenicsIcon } from "./plannisthenics-icon";
import { UCIcon } from "./uc-icon";

/**
 * Test de regresión del bug corregido en `fix/lint-a11y-findings`.
 *
 * `UCIcon` y `MestiIcon` aceptaban `props` y las descartaban. Como `UCIcon`
 * además trae `width`/`height` fijos en el SVG, el `className` que le pasaban
 * la landing y la página de experiencia no tenía efecto y el logo se
 * renderizaba a 209x120 px en vez del tamaño pedido.
 *
 * El caso es fácil de reintroducir sin darse cuenta al editar un SVG, así que
 * conviene tenerlo cubierto.
 */

const forwardingIcons = [
  ["UCIcon", UCIcon],
  ["MestiIcon", MestiIcon],
  ["AtipicusIcon", AtipicusIcon],
] as const;

describe("iconos", () => {
  describe.each(forwardingIcons)("%s", (_name, Icon) => {
    it("reenvía className al <svg>", () => {
      const { container } = render(<Icon className="w-7 h-7" />);
      const svg = container.querySelector("svg");

      expect(svg).not.toBeNull();
      expect(svg).toHaveClass("w-7", "h-7");
    });

    it("queda oculto para lectores de pantalla por ser decorativo", () => {
      const { container } = render(<Icon />);
      expect(container.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });
  });

  // Recibe `className` como prop nombrada en vez de extender SVGProps.
  describe("PlannisthenicsIcon", () => {
    it("aplica className y se oculta de la accesibilidad", () => {
      const { container } = render(<PlannisthenicsIcon className="w-7 h-7" />);
      const svg = container.querySelector("svg");

      expect(svg).toHaveClass("w-7", "h-7");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});
