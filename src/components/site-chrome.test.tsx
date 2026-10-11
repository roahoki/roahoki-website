import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GITHUB_URL, INSTAGRAM_URL, LINKEDIN_URL } from "@/lib/profile";
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

  it("lleva solo el logo", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");

    expect(header).toHaveTextContent(/^roahoki$/);
    expect(within(header).getAllByRole("link")).toHaveLength(1);
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
