import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GITHUB_URL,
  INSTAGRAM_DM_URL,
  INSTAGRAM_URL,
  LINKEDIN_URL,
} from "@/lib/profile";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("el logo es el link al home y se llama roahoki", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "roahoki" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  // Instagram es el canal de conversación: "escríbeme" abre un mensaje, no el
  // perfil, y en otra pestaña para no sacar al visitante del sitio. Dentro del
  // navegador de Instagram cambia: ver `instagram-dm-link.test.tsx`.
  it("escríbeme abre un mensaje directo de Instagram en otra pestaña", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "escríbeme" });

    expect(link).toHaveAttribute("href", INSTAGRAM_DM_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("lleva solo el logo y escríbeme, sin bajada", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("banner")).toHaveTextContent(/^roahokiescríbeme$/);
  });

  // La palabra del logo y "escríbeme" comparten línea base; la figura, más
  // alta, no debe empujar el texto.
  it("alinea el logo y escríbeme por la línea base", () => {
    render(<SiteHeader />);
    const row = screen.getByRole("link", { name: "escríbeme" }).parentElement;

    expect(row).toHaveClass("items-baseline");
  });
});

describe("SiteFooter", () => {
  it.each([
    ["instagram", INSTAGRAM_URL],
    ["github", GITHUB_URL],
    ["linkedin", LINKEDIN_URL],
  ])("enlaza %s", (label, href) => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");

    expect(within(footer).getByRole("link", { name: label })).toHaveAttribute(
      "href",
      href,
    );
  });

  it("firma con roahoki :)", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent("roahoki :)");
  });
});
