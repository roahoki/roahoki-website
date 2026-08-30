import { describe, expect, it } from "vitest";
import { config } from "./proxy";

/**
 * El matcher decide qué rutas pasan por el middleware.
 *
 * Se prueba la regla y no la página porque el fallo es silencioso: si `/admin`
 * dejara de estar en el matcher, el layout protegido no recibiría el
 * `x-pathname`, el redirect al login perdería el `?next=` y todo seguiría
 * compilando y pasando los tests de la página.
 */

/** El matcher, evaluado como lo evaluaría Next: contra el path completo. */
function atrapa(path: string): boolean {
  return config.matcher.some((pattern) =>
    new RegExp(`^${pattern.replace(/\/:path\*$/, "(?:/.*)?")}$`).test(path),
  );
}

describe("matcher de src/proxy.ts", () => {
  it("atrapa /admin y todo lo que cuelga de él", () => {
    for (const path of ["/admin", "/admin/stats", "/admin/logbook/nueva"]) {
      expect(atrapa(path)).toBe(true);
    }
  });

  it("deja pasar de largo las rutas públicas", () => {
    // Ninguna necesita nada del middleware: el sitio es de un solo idioma, así
    // que no hay prefijo que resolver antes del request.
    for (const path of [
      "/",
      "/projects",
      "/experience",
      "/testimonials/new",
      "/logbook",
      "/logbook/una-nota",
      "/stats",
    ]) {
      expect(atrapa(path)).toBe(false);
    }
  });

  it("no atrapa la API ni los archivos estáticos", () => {
    for (const path of [
      "/api/admin/stats",
      "/favicon.ico",
      "/_next/static/chunk.js",
    ]) {
      expect(atrapa(path)).toBe(false);
    }
  });
});
