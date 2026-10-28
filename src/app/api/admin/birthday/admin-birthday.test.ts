import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests de los handlers del panel del cumpleaños.
 *
 * Se sustituyen las queries y la autorización: lo que se verifica es el
 * contrato HTTP (qué código devuelve en cada caso), no Drizzle ni la sesión,
 * que tienen sus propios tests.
 */

const requireAdmin = vi.hoisted(() => vi.fn());
const queries = vi.hoisted(() => ({
  createGuest: vi.fn(),
  updateGuest: vi.fn(),
  deleteGuest: vi.fn(),
  regenerateToken: vi.fn(),
  saveRoki: vi.fn(),
  setRsvp: vi.fn(),
  setAlbum: vi.fn(),
  setEventTexts: vi.fn(),
  createFaq: vi.fn(),
  answerQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/birthday/queries", () => queries);

const guests = await import("./guests/route");
const guest = await import("./guests/[id]/route");
const token = await import("./guests/[id]/token/route");
const roki = await import("./guests/[id]/roki/route");
const rsvps = await import("./guests/[id]/rsvps/route");
const albums = await import("./albums/route");
const texts = await import("./texts/route");
const questions = await import("./questions/route");
const question = await import("./questions/[id]/route");

const ID = "5b9d1a5e-3f6c-4f2b-9a11-2c3d4e5f6a7b";
const GUEST = { id: ID, name: "cata", token: "Ab3dEf6hIj9L" };
const params = (id = ID) => ({ params: Promise.resolve({ id }) });

function request(body?: unknown): NextRequest {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(null);
});

describe("POST /api/admin/birthday/guests", () => {
  it("crea al invitado con los datos limpios", async () => {
    queries.createGuest.mockResolvedValue(GUEST);
    const res = await guests.POST(
      request({ name: " cata ", invitedEvents: ["run", "hike"] }),
    );
    expect(res.status).toBe(201);
    expect(queries.createGuest).toHaveBeenCalledWith({
      name: "cata",
      phone: undefined,
      personalMessage: undefined,
      invitedEvents: ["run", "hike"],
    });
  });

  it("explica en español qué falta", async () => {
    const res = await guests.POST(request({ name: "cata", invitedEvents: [] }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Elige al menos un plan.",
    });
  });

  it("no deja pasar sin sesión", async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await guests.POST(
      request({ name: "cata", invitedEvents: ["run"] }),
    );
    expect(res.status).toBe(401);
    expect(queries.createGuest).not.toHaveBeenCalled();
  });
});

describe("/api/admin/birthday/guests/[id]", () => {
  it("rechaza un id que no es uuid antes de ir a la base", async () => {
    const res = await guest.DELETE(request(), params("nope"));
    expect(res.status).toBe(400);
    expect(queries.deleteGuest).not.toHaveBeenCalled();
  });

  it("responde 404 si el invitado no existe", async () => {
    queries.updateGuest.mockResolvedValue(undefined);
    const res = await guest.PATCH(
      request({ name: "cata", invitedEvents: ["run"] }),
      params(),
    );
    expect(res.status).toBe(404);
  });

  it("elimina al invitado", async () => {
    queries.deleteGuest.mockResolvedValue(true);
    const res = await guest.DELETE(request(), params());
    expect(res.status).toBe(204);
  });

  it("regenera el link", async () => {
    queries.regenerateToken.mockResolvedValue({
      ...GUEST,
      token: "Zz9yXx8wWv7U",
    });
    const res = await token.POST(request(), params());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      guest: { token: "Zz9yXx8wWv7U" },
    });
  });

  it("borra el roki", async () => {
    queries.saveRoki.mockResolvedValue(true);
    const res = await roki.DELETE(request(), params());
    expect(res.status).toBe(204);
    expect(queries.saveRoki).toHaveBeenCalledWith(ID, null);
  });
});

describe("PUT /api/admin/birthday/guests/[id]/rsvps", () => {
  it("corrige una respuesta, o la borra con null", async () => {
    queries.setRsvp.mockResolvedValue("saved");
    expect(
      (await rsvps.PUT(request({ event: "run", status: "going" }), params()))
        .status,
    ).toBe(200);
    await rsvps.PUT(request({ event: "run", status: null }), params());
    expect(queries.setRsvp).toHaveBeenLastCalledWith(ID, "run", null);
  });

  it("no responde un plan al que no está invitado", async () => {
    queries.setRsvp.mockResolvedValue("not_invited");
    const res = await rsvps.PUT(
      request({ event: "cocktail", status: "going" }),
      params(),
    );
    expect(res.status).toBe(409);
  });
});

describe("PUT /api/admin/birthday/albums", () => {
  it("guarda un álbum https", async () => {
    const res = await albums.PUT(
      request({
        event: "party",
        url: "https://www.icloud.com/sharedalbum/#B0a",
      }),
    );
    expect(res.status).toBe(200);
    expect(queries.setAlbum).toHaveBeenCalledWith(
      "party",
      "https://www.icloud.com/sharedalbum/#B0a",
    );
  });

  it("rechaza un link que no es https", async () => {
    const res = await albums.PUT(
      request({ event: "party", url: "http://x.com" }),
    );
    expect(res.status).toBe(400);
    expect(queries.setAlbum).not.toHaveBeenCalled();
  });
});

describe("PUT /api/admin/birthday/texts", () => {
  it("guarda la pregunta y los datos, recortando espacios", async () => {
    const res = await texts.PUT(
      request({
        event: "party",
        texts: {
          question: " ¿vas? ",
          details: [{ label: "¿me puedo quedar?", value: "sí, trae saco " }],
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(queries.setEventTexts).toHaveBeenCalledWith("party", {
      question: "¿vas?",
      details: [{ label: "¿me puedo quedar?", value: "sí, trae saco" }],
    });
  });

  it("vuelve a los textos originales con texts: null", async () => {
    const res = await texts.PUT(request({ event: "party", texts: null }));
    expect(res.status).toBe(200);
    expect(queries.setEventTexts).toHaveBeenCalledWith("party", null);
  });

  it("rechaza un dato sin subtítulo y no guarda", async () => {
    const res = await texts.PUT(
      request({
        event: "party",
        texts: { question: "¿vas?", details: [{ label: " ", value: "x" }] },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Cada dato necesita un subtítulo.");
    expect(queries.setEventTexts).not.toHaveBeenCalled();
  });

  it("sin sesión no guarda", async () => {
    requireAdmin.mockResolvedValue(
      Response.json({ error: "No autorizado." }, { status: 401 }),
    );
    const res = await texts.PUT(request({ event: "party", texts: null }));
    expect(res.status).toBe(401);
    expect(queries.setEventTexts).not.toHaveBeenCalled();
  });
});

describe("dudas desde el panel", () => {
  it("publica una duda frecuente ya respondida", async () => {
    const res = await questions.POST(
      request({
        event: "party",
        question: "¿me puedo quedar a dormir?",
        answer: "sí, trae saco",
      }),
    );
    expect(res.status).toBe(201);
    expect(queries.createFaq).toHaveBeenCalledWith(
      "party",
      "¿me puedo quedar a dormir?",
      "sí, trae saco",
    );
  });

  it("no publica una duda frecuente sin respuesta", async () => {
    const res = await questions.POST(
      request({ event: "party", question: "¿a qué hora?", answer: "" }),
    );
    expect(res.status).toBe(400);
    expect(queries.createFaq).not.toHaveBeenCalled();
  });

  it("responde una duda", async () => {
    queries.answerQuestion.mockResolvedValue(true);
    const res = await question.PATCH(request({ answer: " sí " }), params());
    expect(res.status).toBe(200);
    expect(queries.answerQuestion).toHaveBeenCalledWith(ID, "sí");
  });

  it("404 al responder una duda que ya no existe", async () => {
    queries.answerQuestion.mockResolvedValue(false);
    const res = await question.PATCH(request({ answer: "sí" }), params());
    expect(res.status).toBe(404);
  });

  it("borra una duda y rechaza un id inválido", async () => {
    queries.deleteQuestion.mockResolvedValue(true);
    expect((await question.DELETE(request(), params())).status).toBe(204);
    expect((await question.DELETE(request(), params("x"))).status).toBe(400);
  });

  it("sin sesión no responde", async () => {
    requireAdmin.mockResolvedValue(
      Response.json({ error: "No autorizado." }, { status: 401 }),
    );
    const res = await question.PATCH(request({ answer: "sí" }), params());
    expect(res.status).toBe(401);
    expect(queries.answerQuestion).not.toHaveBeenCalled();
  });
});
