import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El módulo del cliente de base de datos no debe pedir `DATABASE_URL` al
 * importarse, solo al ejecutar una query.
 *
 * La primera versión abría la conexión al evaluar el módulo, y eso rompió el
 * deploy: `next build` importa cada route handler en el paso de *collect page
 * data*, así que compilar pasó a exigir una credencial de runtime. El build
 * falló entero con "Failed to collect page data for /api/admin/testimonials",
 * un mensaje que no menciona la variable que falta.
 *
 * No necesita Postgres: nunca llega a conectarse.
 */
describe("cliente de base de datos", () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = original;
    }
  });

  it("se puede importar sin DATABASE_URL definida", async () => {
    await expect(import("@/db")).resolves.toHaveProperty("getDb");
  });

  it("recién al pedir el cliente falla, y dice qué variable falta", async () => {
    const { getDb } = await import("@/db");

    expect(() => getDb()).toThrowError(/DATABASE_URL/);
  });
});
