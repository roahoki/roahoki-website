import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({
  getGuestByToken: vi.fn(),
  askQuestion: vi.fn(),
  MAX_PENDING_QUESTIONS: 3,
}));
vi.mock("@/lib/birthday/queries", () => queries);

const { POST } = await import("./route");

const TOKEN = "Ab3dEf6hIj9L";
const GUEST = { id: "g1", invitedEvents: ["run", "party", "hike"] };

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/birthday/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/birthday/questions", () => {
  it("guarda la duda del invitado, recortada", async () => {
    queries.getGuestByToken.mockResolvedValue(GUEST);
    queries.askQuestion.mockResolvedValue({
      status: "saved",
      question: {
        id: "q1",
        question: "¿puedo dormir?",
        answer: null,
        mine: true,
      },
    });
    const res = await POST(
      request({ token: TOKEN, event: "party", question: " ¿puedo dormir? " }),
    );
    expect(res.status).toBe(201);
    expect(queries.askQuestion).toHaveBeenCalledWith(
      "g1",
      "party",
      "¿puedo dormir?",
    );
    expect((await res.json()).question.mine).toBe(true);
  });

  it("rechaza una duda vacía sin tocar la base", async () => {
    const res = await POST(
      request({ token: TOKEN, event: "party", question: "  " }),
    );
    expect(res.status).toBe(400);
    expect(queries.getGuestByToken).not.toHaveBeenCalled();
  });

  it("un plan no invitado no existe", async () => {
    queries.getGuestByToken.mockResolvedValue(GUEST);
    const res = await POST(
      request({
        token: TOKEN,
        event: "cocktail",
        question: "¿hay que ir formal?",
      }),
    );
    expect(res.status).toBe(404);
    expect(queries.askQuestion).not.toHaveBeenCalled();
  });

  it("un link que no es de nadie no pregunta", async () => {
    queries.getGuestByToken.mockResolvedValue(undefined);
    const res = await POST(
      request({ token: TOKEN, event: "party", question: "¿a qué hora?" }),
    );
    expect(res.status).toBe(404);
  });

  it("frena al cuarto pendiente en el mismo plan", async () => {
    queries.getGuestByToken.mockResolvedValue(GUEST);
    queries.askQuestion.mockResolvedValue({ status: "too_many" });
    const res = await POST(
      request({ token: TOKEN, event: "party", question: "¿y otra más?" }),
    );
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe(
      "Ya tienes 3 dudas esperando respuesta en este plan.",
    );
  });
});
