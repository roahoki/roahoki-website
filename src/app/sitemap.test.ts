import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LogbookEntry } from "@/db/schema";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

const queries = vi.hoisted(() => ({
  shouldFail: false,
  entries: [] as LogbookEntry[],
}));

vi.mock("@/lib/logbook/queries", () => ({
  listPublishedEntries: async () => {
    if (queries.shouldFail) throw new Error("relation does not exist");
    return queries.entries;
  },
}));

function entry(overrides: Partial<LogbookEntry> = {}): LogbookEntry {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "una-nota",
    title: "Una nota",
    summary: null,
    bodyMd: "cuerpo",
    coverImageUrl: null,
    tags: [],
    status: "published",
    publishedAt: "2026-08-01T12:00:00.000Z",
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  } as LogbookEntry;
}

const sitemap = async () => (await import("./sitemap")).default();

beforeEach(() => {
  queries.shouldFail = false;
  queries.entries = [];
});

describe("sitemap", () => {
  it("incluye todas las rutas públicas del catálogo", async () => {
    const urls = (await sitemap()).map((item) => item.url);

    for (const route of PUBLIC_ROUTES) {
      expect(urls).toContain(`https://www.roahoki.com${route.path}`);
    }
  });

  it("incluye una entrada por cada nota publicada", async () => {
    queries.entries = [
      entry({ slug: "una-nota" }),
      entry({ slug: "otra-nota" }),
    ];

    const urls = (await sitemap()).map((item) => item.url);

    expect(urls).toContain("https://www.roahoki.com/logbook/una-nota");
    expect(urls).toContain("https://www.roahoki.com/logbook/otra-nota");
  });

  it("no incluye el formulario de testimonios ni el panel", async () => {
    const urls = (await sitemap()).map((item) => item.url);

    expect(urls.some((url) => url.includes("/testimonials/new"))).toBe(false);
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
  });

  it("fecha cada nota con su updatedAt", async () => {
    queries.entries = [entry({ updatedAt: "2026-08-20T09:30:00.000Z" })];

    const note = (await sitemap()).find((item) =>
      item.url.endsWith("/logbook/una-nota"),
    );

    expect(note?.lastModified).toEqual(new Date("2026-08-20T09:30:00.000Z"));
  });

  it("fecha el listado con la nota modificada más recientemente", async () => {
    // Ordenadas por publicación, no por edición: la más nueva de la lista no es
    // necesariamente la última tocada, y es esta última la que cambió el listado.
    queries.entries = [
      entry({ slug: "reciente", updatedAt: "2026-08-10T00:00:00.000Z" }),
      entry({ slug: "vieja-editada", updatedAt: "2026-08-25T00:00:00.000Z" }),
    ];

    const listing = (await sitemap()).find((item) =>
      item.url.endsWith("/logbook"),
    );

    expect(listing?.lastModified).toEqual(new Date("2026-08-25T00:00:00.000Z"));
  });

  it("no le pone fecha a las páginas escritas a mano", async () => {
    const home = (await sitemap()).find(
      (item) => item.url === "https://www.roahoki.com/",
    );

    // Fecharlas con el día del build declararía un cambio en cada deploy.
    expect(home?.lastModified).toBeUndefined();
  });

  it("sale con las rutas estáticas si la base no responde, en vez de voltear el build", async () => {
    queries.shouldFail = true;

    const urls = (await sitemap()).map((item) => item.url);

    expect(urls).toContain("https://www.roahoki.com/");
    expect(urls.some((url) => url.includes("/logbook/"))).toBe(false);
  });
});
