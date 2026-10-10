import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EntryCard, type EntryCardData } from "./entry-card";

function card(overrides: Partial<EntryCardData> = {}): EntryCardData {
  return {
    number: 25,
    slug: "volver-despues-de-un-mes",
    title: "volver después de un mes sin publicar",
    summary: "Dejé de publicar el 25 de agosto.",
    coverImageUrl: null,
    coverCropX: 0.5,
    coverCropY: 0.5,
    coverZoom: 1,
    format: "thought",
    tags: ["hábitos"],
    publishedAt: "2026-09-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("EntryCard", () => {
  it("enlaza a la entrada desde el título", () => {
    render(<EntryCard entry={card()} />);

    expect(
      screen.getByRole("link", { name: /volver después de un mes/ }),
    ).toHaveAttribute("href", "/logbook/volver-despues-de-un-mes");
  });

  it("muestra número, fecha corta y formato en una línea", () => {
    render(<EntryCard entry={card()} />);
    const date = screen.getByText("24 sept 2026");

    expect(date).toHaveAttribute("datetime", "2026-09-24T12:00:00.000Z");
    expect(date.parentElement).toHaveTextContent(
      "#2524 sept 2026un pensamiento",
    );
  });

  it("omite el formato si la nota no tiene uno", () => {
    render(<EntryCard entry={card({ format: null })} />);

    expect(screen.queryByText("un pensamiento")).not.toBeInTheDocument();
  });

  // La portada más común: sin foto, el número grande sobre verde botella.
  it("sin foto, la portada es tipográfica y decorativa", () => {
    const { container } = render(<EntryCard entry={card()} />);
    const number = container.querySelector(".text-cover-number");

    expect(number).toHaveTextContent("#25");
    expect(number).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img")).toBeNull();
  });

  it("con foto, la recorta con el encuadre guardado", () => {
    const { container } = render(
      <EntryCard
        entry={card({
          coverImageUrl:
            "https://xutwlpliollsczaatoxd.supabase.co/storage/v1/object/public/logbook-images/foto.jpg",
          coverCropX: 0.25,
          coverCropY: 1,
          coverZoom: 1.5,
        })}
      />,
    );
    const img = container.querySelector("img");

    expect(img).toHaveClass("object-cover");
    expect(img).toHaveStyle({
      objectPosition: "25% 100%",
      transform: "scale(1.5)",
    });
    expect(container.querySelector(".text-cover-number")).toBeNull();
  });

  it("muestra el extracto solo si existe", () => {
    const { rerender } = render(<EntryCard entry={card()} />);
    expect(
      screen.getByText("Dejé de publicar el 25 de agosto."),
    ).toBeInTheDocument();

    rerender(<EntryCard entry={card({ summary: null })} />);
    expect(
      screen.queryByText("Dejé de publicar el 25 de agosto."),
    ).not.toBeInTheDocument();
  });

  it("lista los tags fuera del link y no deja una lista vacía", () => {
    const { rerender } = render(
      <EntryCard entry={card({ tags: ["la prenda", "costura"] })} />,
    );
    const tags = screen.getByRole("list", { name: "tags" });

    expect(tags).toHaveTextContent("la prendacostura");
    expect(tags.closest("a")).toBeNull();

    rerender(<EntryCard entry={card({ tags: [] })} />);
    expect(screen.queryByRole("list", { name: "tags" })).toBeNull();
  });
});
