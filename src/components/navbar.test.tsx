import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "./navbar";

/**
 * El navbar es la única puerta de entrada al logbook desde el sitio.
 *
 * Se sustituye next-themes porque no funciona fuera de un request de Next, y lo
 * que se prueba acá es el link, no el tema.
 */
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

describe("Navbar — el link al logbook", () => {
  it("apunta a /logbook", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Logbook" })).toHaveAttribute(
      "href",
      "/logbook",
    );
  });

  it("no queda dentro de un contenedor que se oculta en móvil", () => {
    render(<Navbar />);

    // Los links de la landing viven en un `<nav>` con `hidden md:flex`. Si el
    // del logbook terminara ahí, desaparecería justo en el dispositivo desde el
    // que llega quien abre el sitio desde una historia de Instagram — y el test
    // seguiría pasando si solo mirara el `href`.
    for (
      let node: HTMLElement | null = screen.getByRole("link", {
        name: "Logbook",
      });
      node !== null;
      node = node.parentElement
    ) {
      expect(node.className).not.toContain("hidden");
    }
  });
});
