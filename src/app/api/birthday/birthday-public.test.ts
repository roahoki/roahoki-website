import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Las dos rutas públicas de la página del invitado. Sin sesión: el token es la
 * credencial, así que lo que importa es que un token inválido no toque nada.
 */
const queries = vi.hoisted(() => ({
  getGuestByToken: vi.fn(),
  recordVisit: vi.fn(),
  markScratched: vi.fn(),
}));
vi.mock("@/lib/birthday/queries", () => queries);

const visit = await import("./visit/route");
const scratch = await import("./scratch/route");

const TOKEN = "Ab3dEf6hIj9L";

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/birthday/visit", () => {
  it("anota la visita del invitado", async () => {
    queries.getGuestByToken.mockResolvedValue({ id: "g1" });
    const res = await visit.POST(request({ token: TOKEN }));
    expect(res.status).toBe(204);
    expect(queries.recordVisit).toHaveBeenCalledWith("g1");
  });

  it("no consulta la base con un token que no tiene la forma", async () => {
    const res = await visit.POST(request({ token: "../admin" }));
    expect(res.status).toBe(404);
    expect(queries.getGuestByToken).not.toHaveBeenCalled();
  });

  it("responde 404 si el token no es de nadie", async () => {
    queries.getGuestByToken.mockResolvedValue(undefined);
    const res = await visit.POST(request({ token: TOKEN }));
    expect(res.status).toBe(404);
    expect(queries.recordVisit).not.toHaveBeenCalled();
  });
});

describe("POST /api/birthday/scratch", () => {
  it("guarda que raspó", async () => {
    queries.markScratched.mockResolvedValue(true);
    expect((await scratch.POST(request({ token: TOKEN }))).status).toBe(204);
    expect(queries.markScratched).toHaveBeenCalledWith(TOKEN);
  });

  it("responde 404 si el token no es de nadie", async () => {
    queries.markScratched.mockResolvedValue(false);
    expect((await scratch.POST(request({ token: TOKEN }))).status).toBe(404);
  });
});
