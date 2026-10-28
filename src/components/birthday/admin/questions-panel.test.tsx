import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionsPanel } from "./questions-panel";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const PENDING = {
  id: "5b9d1a5e-3f6c-4f2b-9a11-2c3d4e5f6a7b",
  question: "¿me puedo quedar a dormir?",
  answer: null,
  guestName: "cata",
  createdAt: "2026-10-28T12:00:00Z",
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

describe("QuestionsPanel", () => {
  it("responde una duda pendiente, con quién la hizo", async () => {
    render(<QuestionsPanel event="party" questions={[PENDING]} />);
    expect(screen.getByText("cata · sin responder")).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("respuesta a «¿me puedo quedar a dormir?»"),
      { target: { value: "sí, trae saco" } },
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "responder" }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/birthday/questions/${PENDING.id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ answer: "sí, trae saco" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("publica una duda frecuente", async () => {
    render(<QuestionsPanel event="party" questions={[]} />);
    expect(
      screen.getByText("Todavía nadie pregunta nada."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("duda frecuente"), {
      target: { value: "¿a qué hora?" },
    });
    fireEvent.change(screen.getByLabelText("respuesta de la duda frecuente"), {
      target: { value: "desde las 21:00" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "publicar" }));
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      event: "party",
      question: "¿a qué hora?",
      answer: "desde las 21:00",
    });
  });

  it("borra una duda después de confirmar", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(
      <QuestionsPanel
        event="party"
        questions={[{ ...PENDING, answer: "sí", guestName: null }]}
      />,
    );
    expect(screen.getByText("duda frecuente")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "borrar la duda «¿me puedo quedar a dormir?»",
        }),
      );
    });
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});
