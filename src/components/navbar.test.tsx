import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "./navbar";

/**
 * El navbar es la única puerta de entrada al logbook desde el sitio.
 *
 * Se sustituyen next-intl, next-themes y el enrutador de i18n: nada de eso
 * funciona fuera de un request de Next, y lo que se prueba acá es el link, no
 * la traducción ni el tema.
 */
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("Navbar — el link al logbook", () => {
  it("apunta a /logbook, sin prefijo de idioma", () => {
    render(<Navbar />);

    // El prefijo es el error fácil: usar el `Link` de `@/i18n/navigation` en vez
    // del de `next/link` produce `/es/logbook`, que no existe porque el logbook
    // nace fuera de `[locale]`.
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
