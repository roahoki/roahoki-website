import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminTopbar } from "./admin-topbar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("AdminTopbar", () => {
  it("muestra la sección y vuelve a las notas desde la figura", () => {
    render(<AdminTopbar title="notas" />);
    const home = screen.getByText("notas").closest("a");

    expect(home).toHaveAttribute("href", "/admin/logbook");
  });

  // Escritorio y móvil llevan el mismo menú: uno en línea y otro en un
  // `<details>`. Los dos tienen que ofrecer las mismas salidas.
  it.each([0, 1])(
    "el menú %i ofrece stats, testimonios, ver sitio y salir",
    (index) => {
      render(<AdminTopbar title="notas" />);
      const menu = screen.getAllByRole("navigation", { name: "panel" })[index];

      for (const [label, href] of [
        ["stats", "/admin/stats"],
        ["testimonios", "/admin/testimonials"],
        ["ver sitio", "/"],
      ]) {
        expect(within(menu).getByRole("link", { name: label })).toHaveAttribute(
          "href",
          href,
        );
      }
      expect(
        within(menu).getByRole("button", { name: "salir" }),
      ).toBeInTheDocument();
    },
  );

  it("en escritorio trae + nueva nota", () => {
    render(<AdminTopbar title="notas" />);

    expect(screen.getByRole("link", { name: "+ nueva nota" })).toHaveAttribute(
      "href",
      "/admin/logbook/new",
    );
  });
});
