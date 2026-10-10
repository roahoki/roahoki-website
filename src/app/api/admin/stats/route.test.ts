import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests del handler que registra un movimiento del contador.
 *
 * Se sustituyen las queries, la autorización y `next/cache`: lo que se verifica
 * es el contrato HTTP —qué código devuelve ante cada situación y qué invalida—,
 * no que Drizzle guarde ni que la sesión sea válida, que ya tienen sus propios
 * tests.
 *
 * El caso que más importa es el 409. `recordEvent` rechaza el "−" que dejaría
 * la semana en negativo devolviendo `undefined`, y un handler que no distinga
 * ese `undefined` respondería 201 con `total: undefined`: el panel daría el tap
 * por bueno y mostraría un número que la base no tiene.
 */

const revalidatePath = vi.hoisted(() => vi.fn());
const requireAdmin = vi.hoisted(() => vi.fn());
const queries = vi.hoisted(() => ({
  recordEvent: vi.fn(),
  currentWeekTotals: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/stats/queries", () => queries);

const { POST } = await import("./route");

const EVENT = {
  id: "5b9d1a5e-3f6c-4f2b-9a11-2c3d4e5f6a7b",
  exercise: "pull_ups",
  delta: 1,
  createdAt: "2026-08-26T12:00:00.000Z",
};

function jsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(null);
  queries.recordEvent.mockResolvedValue(EVENT);
  queries.currentWeekTotals.mockResolvedValue({
    pull_ups: 12,
    push_ups: 0,
    squats: 0,
    dips: 0,
    handstand_seconds: 0,
    pistol_squats: 0,
  });
});

describe("POST /api/admin/stats", () => {
  it("guarda el tap y devuelve el total ya recalculado", async () => {
    const response = await POST(
      jsonRequest({ exercise: "pull_ups", direction: "up" }),
    );

    expect(response.status).toBe(201);
    // El total va en la respuesta para que el panel pueda corregir su número
    // optimista sin tener que recargar la página.
    await expect(response.json()).resolves.toEqual({
      event: EVENT,
      total: 12,
    });
  });

  it("traduce la dirección a un delta con signo", async () => {
    await POST(jsonRequest({ exercise: "squats", direction: "up" }));
    expect(queries.recordEvent).toHaveBeenCalledWith("squats", 1);

    await POST(jsonRequest({ exercise: "squats", direction: "down" }));
    expect(queries.recordEvent).toHaveBeenCalledWith("squats", -1);
  });

  it("suma la cantidad de una serie escrita, en vez del paso de un tap", async () => {
    await POST(
      jsonRequest({ exercise: "squats", direction: "up", amount: 12 }),
    );

    expect(queries.recordEvent).toHaveBeenCalledWith("squats", 12);
  });

  it("invalida la página pública", async () => {
    // Sin esto, `/stats` seguiría sirviendo el HTML viejo y el número público
    // quedaría atrasado respecto del que muestra el panel.
    await POST(jsonRequest({ exercise: "pull_ups", direction: "up" }));

    expect(revalidatePath).toHaveBeenCalledWith("/stats");
  });

  describe("cuando el decremento dejaría la semana en negativo", () => {
    beforeEach(() => {
      queries.recordEvent.mockResolvedValue(undefined);
    });

    it("responde 409 y explica por qué", async () => {
      const response = await POST(
        jsonRequest({ exercise: "pull_ups", direction: "down" }),
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        error: "El contador ya está en cero.",
      });
    });

    it("no invalida nada", async () => {
      // No se guardó ninguna fila: tirar el caché de la página pública sería
      // regenerarla para mostrar exactamente lo mismo.
      await POST(jsonRequest({ exercise: "pull_ups", direction: "down" }));

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("validación", () => {
    it("rechaza un ejercicio que no existe", async () => {
      const response = await POST(
        jsonRequest({ exercise: "burpees", direction: "up" }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Ese ejercicio no existe.",
      });
      expect(queries.recordEvent).not.toHaveBeenCalled();
    });

    it("rechaza una dirección inventada", async () => {
      const response = await POST(
        jsonRequest({ exercise: "pull_ups", direction: "sube" }),
      );

      expect(response.status).toBe(400);
      expect(queries.recordEvent).not.toHaveBeenCalled();
    });

    it("rechaza una cantidad fuera de rango, sin tocar la base", async () => {
      // El `max` del `<input>` es una ayuda visual: un request armado a mano
      // llega igual, y lo que lo frena es el esquema.
      for (const amount of [0, -3, 2.5, 9999, "12"]) {
        const response = await POST(
          jsonRequest({ exercise: "pull_ups", direction: "up", amount }),
        );

        expect(response.status).toBe(400);
      }

      expect(queries.recordEvent).not.toHaveBeenCalled();
    });

    it("rechaza un cuerpo que no es JSON", async () => {
      const request = new Request("http://localhost/api/admin/stats", {
        method: "POST",
        body: "no soy json",
      }) as NextRequest;

      const response = await POST(request);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Cuerpo inválido.",
      });
    });
  });

  it("no deja pasar a quien no tiene sesión", async () => {
    // El layout de `(protected)` protege las páginas; pegarle a la API no pasa
    // por ningún layout, así que la guarda tiene que estar acá también.
    requireAdmin.mockResolvedValue(
      Response.json({ error: "No autorizado." }, { status: 401 }),
    );

    const response = await POST(
      jsonRequest({ exercise: "pull_ups", direction: "up" }),
    );

    expect(response.status).toBe(401);
    expect(queries.recordEvent).not.toHaveBeenCalled();
  });

  it("responde 500 si la base falla, sin invalidar", async () => {
    queries.recordEvent.mockRejectedValue(new Error("conexión caída"));

    const response = await POST(
      jsonRequest({ exercise: "pull_ups", direction: "up" }),
    );

    expect(response.status).toBe(500);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
