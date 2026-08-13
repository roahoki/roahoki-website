import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `requireAdmin` es la puerta de la API del panel.
 *
 * Importa probarla aparte de los handlers porque a partir de esta PR hay cinco
 * que dependen de ella: si se rompe, se abren los cinco a la vez.
 *
 * `next/headers` solo existe dentro de un request de Next, así que se sustituye
 * por un doble que devuelve la cookie que cada test quiera.
 */
const cookieValue = vi.hoisted(() => ({
  current: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "admin_session" && cookieValue.current !== undefined
        ? { name, value: cookieValue.current }
        : undefined,
  }),
}));

const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalPassword = process.env.ADMIN_PASSWORD;

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "secreto-de-prueba";
  process.env.ADMIN_PASSWORD = "contraseña-de-prueba";
  cookieValue.current = undefined;
});

afterEach(() => {
  process.env.ADMIN_SESSION_SECRET = originalSecret;
  process.env.ADMIN_PASSWORD = originalPassword;
});

async function callRequireAdmin() {
  const { requireAdmin } = await import("./require-admin");
  return requireAdmin();
}

describe("requireAdmin", () => {
  it("deja pasar con un token válido", async () => {
    const { createSessionToken } = await import("./session");
    cookieValue.current = await createSessionToken();

    expect(await callRequireAdmin()).toBeNull();
  });

  it("responde 401 sin cookie", async () => {
    const denied = await callRequireAdmin();

    expect(denied?.status).toBe(401);
  });

  it("responde 401 con un token basura", async () => {
    cookieValue.current = "no-es-un-token";

    expect((await callRequireAdmin())?.status).toBe(401);
  });

  it("responde 401 con un token expirado", async () => {
    const { createSessionToken, SESSION_TTL_MS } = await import("./session");
    // Emitido en un pasado tan lejano que ya venció.
    cookieValue.current = await createSessionToken(
      Date.now() - SESSION_TTL_MS - 1000,
    );

    expect((await callRequireAdmin())?.status).toBe(401);
  });

  it("responde 401 con un token firmado con otra clave", async () => {
    const { createSessionToken } = await import("./session");
    cookieValue.current = await createSessionToken();
    process.env.ADMIN_SESSION_SECRET = "otro-secreto";

    expect((await callRequireAdmin())?.status).toBe(401);
  });

  it("el 401 no filtra por qué falló", async () => {
    cookieValue.current = "no-es-un-token";
    const denied = await callRequireAdmin();

    await expect(denied?.json()).resolves.toEqual({ error: "No autorizado." });
  });
});
