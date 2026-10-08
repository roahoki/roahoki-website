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
  it("el logo es el link al home y se anuncia como roahoki", () => {
    render(<SiteHeader />);
    const logo = screen.getByRole("img", { name: "roahoki" });

    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });

  // Instagram es el canal de conversación: "escríbeme" abre un mensaje, no el
  // perfil, y en otra pestaña para no sacar al visitante del sitio.
  it("escríbeme abre un mensaje directo de Instagram en otra pestaña", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "escríbeme" });

    expect(link).toHaveAttribute("href", INSTAGRAM_DM_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("trae la bajada, oculta en móvil", () => {
    render(<SiteHeader />);
    const bajada = screen.getByText("compartir aprendizaje, based en santiago");

    expect(bajada).toHaveClass("hidden", "md:block");
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
