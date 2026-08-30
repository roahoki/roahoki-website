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

/**
 * Los dos links del navbar que navegan a otra página, en vez de hacer scroll
 * dentro de la landing. Comparten las dos trampas, así que comparten los tests.
 */
const LINKS_A_OTRA_PAGINA = [
  { label: "Logbook", href: "/logbook" },
  { label: "Stats", href: "/stats" },
];

describe.each(LINKS_A_OTRA_PAGINA)("Navbar — el link a $label", (link) => {
  it(`apunta a ${link.href}, sin prefijo de idioma`, () => {
    render(<Navbar />);

    // El prefijo es el error fácil: usar el `Link` de `@/i18n/navigation` en vez
    // del de `next/link` produce `/es/logbook`, que no existe porque estas
    // páginas nacen fuera de `[locale]`.
    expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
      "href",
      link.href,
    );
  });

  it("no queda dentro de un contenedor que se oculta en móvil", () => {
    render(<Navbar />);

    // Los links de la landing viven en un `<nav>` con `hidden md:flex`. Si uno
    // de estos terminara ahí, desaparecería justo en el dispositivo desde el
    // que llega quien abre el sitio desde una historia de Instagram — y el test
    // seguiría pasando si solo mirara el `href`.
    for (
      let node: HTMLElement | null = screen.getByRole("link", {
        name: link.label,
      });
      node !== null;
      node = node.parentElement
    ) {
      expect(node.className).not.toContain("hidden");
    }
  });
});
