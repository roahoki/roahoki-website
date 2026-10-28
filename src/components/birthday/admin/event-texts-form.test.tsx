import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTextsForm } from "./event-texts-form";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const INITIAL = {
  question: "¿vas?",
  details: [
    { label: "¿dónde?", value: "en mi casa" },
    { label: "temática", value: "trae algo para tomar" },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const sent = () => JSON.parse(fetchMock.mock.calls[0][1].body);

function renderForm(edited = false) {
  render(<EventTextsForm event="party" initial={INITIAL} edited={edited} />);
}

describe("EventTextsForm", () => {
  it("guarda la pregunta y los datos editados, y recarga la vista", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("pregunta"), {
      target: { value: "¿vienes?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "agregar dato" }));
    fireEvent.change(screen.getByLabelText("subtítulo del dato 3"), {
      target: { value: "¿me puedo quedar?" },
    });
    fireEvent.change(screen.getByLabelText("texto del dato 3"), {
      target: { value: "sí, trae saco" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "guardar textos" }));
    });
    expect(sent()).toEqual({
      event: "party",
      texts: {
        question: "¿vienes?",
        details: [
          ...INITIAL.details,
          { label: "¿me puedo quedar?", value: "sí, trae saco" },
        ],
      },
    });
    expect(refresh).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "guardado" }),
    ).toBeInTheDocument();
  });

  it("reordena y quita datos", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "bajar el dato 1" }));
    fireEvent.click(screen.getByRole("button", { name: "quitar el dato 1" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "guardar textos" }));
    });
    expect(sent().texts.details).toEqual([INITIAL.details[0]]);
  });

  it("avisa un dato vacío sin mandar nada", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "agregar dato" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "guardar textos" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cada dato necesita un subtítulo.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("vuelve a los originales solo si hay textos corregidos", async () => {
    renderForm(false);
    expect(
      screen.queryByRole("button", { name: "volver a los originales" }),
    ).not.toBeInTheDocument();
  });

  it("volver a los originales manda texts: null", async () => {
    renderForm(true);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "volver a los originales" }),
      );
    });
    expect(sent()).toEqual({ event: "party", texts: null });
  });
});
