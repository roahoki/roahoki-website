import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El voy / no voy del invitado. Lo que importa: un plan no invitado responde
 * 404 (para ese invitado no existe) y un plan que ya pasó no se responde.
 */
const queries = vi.hoisted(() => ({
  getGuestByToken: vi.fn(),
  setRsvp: vi.fn(),
}));
vi.mock("@/lib/birthday/queries", () => queries);

const { POST } = await import("./route");

const TOKEN = "Ab3dEf6hIj9L";
function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/birthday/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T12:00:00-03:00"));
  queries.getGuestByToken.mockResolvedValue({ id: "g1" });
});
afterEach(() => vi.useRealTimers());

describe("POST /api/birthday/rsvp", () => {
  it("guarda la respuesta", async () => {
    queries.setRsvp.mockResolvedValue("saved");
    const res = await POST(
      request({ token: TOKEN, event: "run", status: "going" }),
    );
    expect(res.status).toBe(200);
    expect(queries.setRsvp).toHaveBeenCalledWith("g1", "run", "going");
  });

  it("trata un plan no invitado como inexistente", async () => {
    queries.setRsvp.mockResolvedValue("not_invited");
    const res = await POST(
      request({ token: TOKEN, event: "cocktail", status: "going" }),
    );
    expect(res.status).toBe(404);
  });

  it("no acepta borrar la respuesta: el invitado solo dice voy o no voy", async () => {
    const res = await POST(
      request({ token: TOKEN, event: "run", status: null }),
    );
    expect(res.status).toBe(400);
    expect(queries.setRsvp).not.toHaveBeenCalled();
  });

  it("no deja responder un plan que ya pasó", async () => {
    vi.setSystemTime(new Date("2026-11-09T10:00:00-03:00"));
    const res = await POST(
      request({ token: TOKEN, event: "run", status: "going" }),
    );
    expect(res.status).toBe(409);
    expect(queries.setRsvp).not.toHaveBeenCalled();
  });

  it("responde 404 a un token que no es de nadie", async () => {
    queries.getGuestByToken.mockResolvedValue(undefined);
    const res = await POST(
      request({ token: TOKEN, event: "run", status: "going" }),
    );
    expect(res.status).toBe(404);
  });
});
