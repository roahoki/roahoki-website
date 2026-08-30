import { describe, expect, it, vi } from "vitest";

/**
 * `next-intl/middleware` importa `next/server`, que no resuelve fuera del
 * bundler de Next. Se sustituye porque lo que se prueba es el `config` que
 * exporta el módulo, no el middleware que arma.
 */
vi.mock("next-intl/middleware", () => ({
  default: () => () => undefined,
}));

const { config } = await import("./proxy");

/**
 * El matcher decide qué rutas atrapa el middleware de next-intl, y lo que hace
 * con lo que atrapa es redirigirlo a `/<locale>/...`.
 *
 * Es un fallo silencioso de los caros: agregar una ruta fuera de `[locale]` y
 * olvidarse de excluirla acá no rompe ningún build ni ningún test de la página
 * —la página está perfecta—, pero en producción `/stats` responde un redirect a
 * `/es/stats`, que no existe. Y se descubre visitándola.
 *
 * Por eso se prueba la regla, no la página.
 */

/** El matcher, evaluado como lo evaluaría Next: contra el path completo. */
function atrapa(path: string): boolean {
  return config.matcher.some((pattern) =>
    new RegExp(`^${pattern}$`).test(path),
  );
}

describe("matcher de src/proxy.ts", () => {
  it("deja pasar las rutas que nacen fuera de [locale]", () => {
    for (const path of [
      "/stats",
      "/logbook",
      "/logbook/una-nota",
      "/admin",
      "/admin/stats",
      "/api/admin/stats",
    ]) {
      expect(atrapa(path)).toBe(false);
    }
  });

  it("sigue atrapando las páginas que sí llevan prefijo de idioma", () => {
    // La landing y sus secciones siguen viviendo dentro de `[locale]`: si el
    // matcher dejara de atraparlas, `/` no redirigiría a `/es` y next-intl no
    // resolvería ningún locale.
    for (const path of ["/", "/projects", "/experience", "/testimonials/new"]) {
      expect(atrapa(path)).toBe(true);
    }
  });

  it("no atrapa los archivos ni las rutas internas de Next", () => {
    for (const path of ["/favicon.ico", "/_next/static/chunk.js", "/_vercel"]) {
      expect(atrapa(path)).toBe(false);
    }
  });
});
