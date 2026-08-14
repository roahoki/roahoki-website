import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El build no puede depender de la base.
 *
 * `/logbook` y `/logbook/[slug]` son las primeras páginas del proyecto que
 * prerenderizan contenido de la base: con `revalidate`, Next las genera durante
 * `next build` y ahí corren queries de verdad. Cuando la query reventaba, el
 * error subía hasta *collect page data* y se caía el deploy entero — fue
 * exactamente lo que pasó con la migración de `logbook_entries` sin aplicar.
 *
 * Estos tests fijan el contrato inverso: con la base caída el build sigue. Se
 * sustituye el módulo de queries porque lo que se prueba es la reacción al
 * error, no la query.
 */

const queries = vi.hoisted(() => ({
  shouldFail: false,
  entries: [] as unknown[],
  slugs: [] as string[],
}));

vi.mock("@/lib/logbook/queries", () => ({
  listPublishedEntries: async () => {
    if (queries.shouldFail) throw new Error("relation does not exist");
    return queries.entries;
  },
  listPublishedSlugs: async () => {
    if (queries.shouldFail) throw new Error("relation does not exist");
    return queries.slugs;
  },
  getPublishedEntryBySlug: async () => undefined,
}));

beforeEach(() => {
  queries.shouldFail = false;
  queries.entries = [];
  queries.slugs = [];
});

describe("generateStaticParams de /logbook/[slug]", () => {
  it("devuelve un parámetro por cada nota publicada", async () => {
    queries.slugs = ["una-nota", "otra-nota"];
    const { generateStaticParams } = await import("./[slug]/page");

    await expect(generateStaticParams()).resolves.toEqual([
      { slug: "una-nota" },
      { slug: "otra-nota" },
    ]);
  });

  it("devuelve una lista vacía si la base no responde, en vez de propagar", async () => {
    queries.shouldFail = true;
    const { generateStaticParams } = await import("./[slug]/page");

    // Vacío significa "no prerenderices ninguna": las notas se generan igual en
    // su primera visita, porque `dynamicParams` viene en true por defecto.
    await expect(generateStaticParams()).resolves.toEqual([]);
  });
});

describe("/logbook", () => {
  it("renderiza el estado vacío si la base no responde, en vez de propagar", async () => {
    queries.shouldFail = true;
    const { default: LogbookPage } = await import("./page");

    // Que resuelva ya es la aserción: si el error se propagara, el build de la
    // página fallaría acá igual que en Vercel.
    await expect(LogbookPage()).resolves.toBeTruthy();
  });
});
