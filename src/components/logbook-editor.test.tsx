import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LogbookEntry } from "@/db/schema";
import { LogbookEditor } from "./logbook-editor";

/**
 * `next/navigation` no funciona fuera de un request de Next.
 *
 * Estos tests cubren lo que el usuario ve y toca —los campos, el toggle de
 * preview, el estado— sin llegar al `fetch`. Guardar de verdad pasa por la API,
 * que ya tiene sus propios tests en la PR 12.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function entryFixture(overrides: Partial<LogbookEntry> = {}): LogbookEntry {
  return {
    id: "3f4a9d2e-1b6c-4c0a-9f5e-7d8a2b1c3e4f",
    slug: "una-nota",
    title: "Una nota",
    summary: "Un resumen",
    bodyMd: "# Hola\n\nUn cuerpo.",
    coverImageUrl: null,
    tags: ["rails", "postgres"],
    status: "published",
    publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LogbookEditor — modo creación", () => {
  it("arranca con los campos vacíos", () => {
    render(<LogbookEditor />);

    expect(screen.getByText("Nueva nota")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("El título de la nota")).toHaveValue("");
  });

  it("explica que el slug se deriva del título", () => {
    render(<LogbookEditor />);

    expect(
      screen.getByText("Si lo dejas vacío se deriva del título."),
    ).toBeInTheDocument();
  });

  it("no ofrece eliminar una nota que todavía no existe", () => {
    render(<LogbookEditor />);

    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("nace como publicada", () => {
    render(<LogbookEditor />);

    expect(screen.getByRole("button", { name: "Publicada" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("permite pasarla a borrador", () => {
    render(<LogbookEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Borrador" }));

    expect(screen.getByRole("button", { name: "Borrador" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Publicada" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("LogbookEditor — modo edición", () => {
  it("precarga los campos de la nota", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    expect(screen.getByText("Editar nota")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("El título de la nota")).toHaveValue(
      "Una nota",
    );
    expect(screen.getByPlaceholderText("se-deriva-del-titulo")).toHaveValue(
      "una-nota",
    );
  });

  it("muestra los tags como texto separado por comas", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    expect(screen.getByPlaceholderText("rails, postgres")).toHaveValue(
      "rails, postgres",
    );
  });

  // Un slug ya publicado es parte de un link que puede estar circulando.
  it("advierte que cambiar el slug rompe los links", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    expect(
      screen.getByText("Cambiarlo rompe los links ya compartidos."),
    ).toBeInTheDocument();
  });

  it("ofrece eliminar", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    expect(
      screen.getByRole("button", { name: "Eliminar" }),
    ).toBeInTheDocument();
  });

  it("refleja el estado de borrador", () => {
    render(<LogbookEditor entry={entryFixture({ status: "draft" })} />);

    expect(screen.getByRole("button", { name: "Borrador" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("LogbookEditor — vista previa", () => {
  it("empieza mostrando el textarea", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    expect(screen.getByPlaceholderText("# Escribe en markdown")).toHaveValue(
      "# Hola\n\nUn cuerpo.",
    );
  });

  it("cambia a la preview y renderiza el markdown", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(screen.getByRole("heading", { name: "Hola" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("# Escribe en markdown")).toBeNull();
  });

  it("vuelve al textarea", () => {
    render(<LogbookEditor entry={entryFixture()} />);

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(
      screen.getByPlaceholderText("# Escribe en markdown"),
    ).toBeInTheDocument();
  });

  it("avisa cuando no hay nada que previsualizar", () => {
    render(<LogbookEditor entry={entryFixture({ bodyMd: "   " })} />);

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(
      screen.getByText("Nada que previsualizar todavía."),
    ).toBeInTheDocument();
  });

  // La preview usa el mismo `MarkdownContent` que la página pública, así que
  // hereda su sanitización: lo que se ve al escribir es lo que se va a publicar.
  it("la preview no ejecuta HTML crudo", () => {
    const { container } = render(
      <LogbookEditor
        entry={entryFixture({ bodyMd: "<script>alert(1)</script>" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(container.querySelector("script")).toBeNull();
  });
});
