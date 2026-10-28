import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({
  getGuestByToken: vi.fn(),
  saveRoki: vi.fn(),
}));
vi.mock("@/lib/birthday/queries", () => queries);
const { POST } = await import("./route");

const TOKEN = "Ab3dEf6hIj9L";
const ROKI = {
  strokes: [
    {
      color: "#101610",
      points: [
        [0.1, 0.1],
        [0.5, 0.5],
      ],
    },
  ],
  eye: null,
};
function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/birthday/roki", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  queries.getGuestByToken.mockResolvedValue({ id: "g1" });
});

describe("POST /api/birthday/roki", () => {
  it("guarda el dibujo del invitado", async () => {
    const res = await POST(request({ token: TOKEN, roki: ROKI }));
    expect(res.status).toBe(204);
    expect(queries.saveRoki).toHaveBeenCalledWith("g1", ROKI);
  });

  it("rechaza un dibujo vacío o fuera del lienzo", async () => {
    expect(
      (await POST(request({ token: TOKEN, roki: { strokes: [], eye: null } })))
        .status,
    ).toBe(400);
    const outside = {
      strokes: [
        {
          color: "#101610",
          points: [
            [0, 0],
            [2, 2],
          ],
        },
      ],
      eye: null,
    };
    expect((await POST(request({ token: TOKEN, roki: outside }))).status).toBe(
      400,
    );
    expect(queries.saveRoki).not.toHaveBeenCalled();
  });

  it("responde 404 a un token que no es de nadie", async () => {
    queries.getGuestByToken.mockResolvedValue(undefined);
    expect((await POST(request({ token: TOKEN, roki: ROKI }))).status).toBe(
      404,
    );
  });
});
