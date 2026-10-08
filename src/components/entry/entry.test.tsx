import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./copy-link-button";
import { EntryNeighbors } from "./entry-neighbors";

describe("CopyLinkButton", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function click() {
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
  }

  it("copia la URL de la entrada y avisa", async () => {
    writeText.mockResolvedValue(undefined);
    render(<CopyLinkButton url="https://www.roahoki.com/logbook/una-nota" />);

    await click();

    expect(writeText).toHaveBeenCalledWith(
      "https://www.roahoki.com/logbook/una-nota",
    );
    expect(screen.getByRole("button")).toHaveTextContent("copiado");
  });

  it("vuelve a su texto después de dos segundos", async () => {
    writeText.mockResolvedValue(undefined);
    render(<CopyLinkButton url="https://www.roahoki.com/logbook/una-nota" />);

    await click();
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("button")).toHaveTextContent("copiar link");
  });

  // Sin permiso de portapapeles no se finge que funcionó.
  it("avisa si no pudo copiar", async () => {
    writeText.mockRejectedValue(new Error("denegado"));
    render(<CopyLinkButton url="https://www.roahoki.com/logbook/una-nota" />);

    await click();

    expect(screen.getByRole("button")).toHaveTextContent("no se pudo copiar");
  });
});

describe("EntryNeighbors", () => {
  const previous = { number: 24, slug: "muscle-up", title: "muscle up" };
  const next = { number: 26, slug: "la-prenda", title: "la prenda" };

  it("enlaza la anterior, el logbook y la siguiente", () => {
    render(<EntryNeighbors previous={previous} next={next} />);

    expect(screen.getByRole("link", { name: "#24 muscle up" })).toHaveAttribute(
      "href",
      "/logbook/muscle-up",
    );
    expect(screen.getByRole("link", { name: "logbook" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "#26 la prenda" })).toHaveAttribute(
      "href",
      "/logbook/la-prenda",
    );
  });

  it("en los extremos lo dice en vez de dejar el hueco", () => {
    render(<EntryNeighbors previous={undefined} next={undefined} />);

    expect(screen.getByText("es la primera")).toBeInTheDocument();
    expect(screen.getByText("es la más nueva")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
