import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanQuestions } from "./plan-questions";

const ANSWERED = {
  id: "q1",
  question: "¿me puedo quedar a dormir?",
  answer: "sí, trae saco",
  mine: false,
};

afterEach(() => vi.unstubAllGlobals());

function renderQuestions(initial = [ANSWERED], passed = false) {
  return render(
    <PlanQuestions
      token="Ab3dEf6hIj9L"
      event="party"
      color="#0E2A47"
      passed={passed}
      initial={initial}
    />,
  );
}

describe("PlanQuestions", () => {
  it("muestra las dudas respondidas", () => {
    renderQuestions();
    expect(screen.getByText("¿me puedo quedar a dormir?")).toBeInTheDocument();
    expect(screen.getByText("sí, trae saco")).toBeInTheDocument();
  });

  it("al preguntar, la duda aparece como suya esperando respuesta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          question: {
            id: "q2",
            question: "¿hay hielo?",
            answer: null,
            mine: true,
          },
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderQuestions();
    fireEvent.change(screen.getByLabelText("tu duda"), {
      target: { value: "¿hay hielo?" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "preguntar" }));
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      token: "Ab3dEf6hIj9L",
      event: "party",
      question: "¿hay hielo?",
    });
    expect(screen.getByText("¿hay hielo?")).toBeInTheDocument();
    expect(screen.getByText(/te respondo pronto/)).toBeInTheDocument();
    expect(screen.getByLabelText("tu duda")).toHaveValue("");
  });

  it("muestra el error de la API y no pierde lo escrito", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Ya tienes 3 dudas esperando respuesta en este plan." },
            { status: 429 },
          ),
        ),
    );
    renderQuestions();
    fireEvent.change(screen.getByLabelText("tu duda"), {
      target: { value: "¿y otra?" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "preguntar" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Ya tienes 3 dudas");
    expect(screen.getByLabelText("tu duda")).toHaveValue("¿y otra?");
  });

  it("no manda una duda vacía", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderQuestions();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "preguntar" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe tu duda.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cuando el plan ya pasó no se pregunta, y sin dudas no aparece", () => {
    const { container, unmount } = renderQuestions([ANSWERED], true);
    expect(screen.queryByLabelText("tu duda")).not.toBeInTheDocument();
    expect(screen.getByText("sí, trae saco")).toBeInTheDocument();
    unmount();
    const empty = renderQuestions([], true);
    expect(empty.container).toBeEmptyDOMElement();
    expect(container).toBeEmptyDOMElement();
  });
});
