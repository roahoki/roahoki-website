import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { eventBySlug } from "@/lib/birthday/events";
import { CocktailImage } from "./cocktail-image";

describe("CocktailImage", () => {
  it("dice qué se celebra, cuándo, dónde y cómo venir", () => {
    render(<CocktailImage />);
    expect(screen.getByText("miércoles 4 de noviembre")).toBeInTheDocument();
    expect(
      screen.getByText(/celebración del cumpleaños y la titulación del joky/),
    ).toBeInTheDocument();
    expect(screen.getByText("será un cóctel :)")).toBeInTheDocument();
    expect(screen.getByText("19:00 a 22:00")).toBeInTheDocument();
    expect(screen.getByText("en mi casa")).toBeInTheDocument();
    expect(screen.getByText("formal")).toBeInTheDocument();
  });

  it("va en el color del cóctel", () => {
    const { container } = render(<CocktailImage />);
    expect(container.firstElementChild).toHaveStyle({
      backgroundColor: eventBySlug("cocktail").color,
    });
  });
});
