import { describe, expect, it } from "vitest";
import type { LogbookEntry } from "@/db/schema";
import { renderLlmsTxt } from "./llms-txt";
import { PUBLIC_ROUTES } from "./public-routes";

function entry(overrides: Partial<LogbookEntry> = {}): LogbookEntry {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "una-nota",
    title: "Una nota",
    summary: "El resumen de la nota.",
    bodyMd: "# Encabezado\n\nEl cuerpo de la nota.",
    coverImageUrl: null,
    tags: [],
    status: "published",
    publishedAt: "2026-08-01T12:00:00.000Z",
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  } as LogbookEntry;
}

describe("renderLlmsTxt", () => {
  it("abre con un único encabezado h1 y el blurb en cita, como pide el formato", () => {
    const [first, second] = renderLlmsTxt([]).split("\n\n");

    expect(first).toMatch(/^# .+/);
    expect(second).toMatch(/^> .+/);
  });

  it("lista todas las rutas públicas, para que no quede una sin anunciar", () => {
    const output = renderLlmsTxt([]);

    for (const route of PUBLIC_ROUTES) {
      expect(output).toContain(`](https://www.roahoki.com${route.path})`);
      expect(output).toContain(route.title);
    }
  });

  it("emite URLs absolutas: el archivo se lee fuera del sitio y una relativa no resuelve", () => {
    const output = renderLlmsTxt([entry()]);
    const urls = [...output.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it("usa el summary de la nota cuando existe", () => {
    const output = renderLlmsTxt([
      entry({ summary: "Resumen escrito a mano." }),
    ]);

    expect(output).toContain(
      "- [Una nota](https://www.roahoki.com/logbook/una-nota): Resumen escrito a mano.",
    );
  });

  it("deriva la descripción del cuerpo cuando la nota no trae summary", () => {
    const output = renderLlmsTxt([
      entry({ summary: null, bodyMd: "# Título\n\nEsto sale del cuerpo." }),
    ]);

    // Sin la sintaxis de markdown: es texto plano dentro de un ítem de lista.
    expect(output).toContain(": Título Esto sale del cuerpo.");
  });

  it("aplana los saltos de línea, que romperían el ítem en dos", () => {
    const output = renderLlmsTxt([
      entry({ summary: "Una línea\ny otra\n\ny otra más" }),
    ]);

    expect(output).toContain(": Una línea y otra y otra más");
  });

  it("omite la sección del logbook si no hay notas, en vez de dejarla vacía", () => {
    // Una lista vacía casi siempre significa que la base no respondió, no que
    // el logbook esté vacío. Anunciarlo vacío sería afirmar algo falso.
    expect(renderLlmsTxt([])).not.toContain("## Logbook");
    expect(renderLlmsTxt([entry()])).toContain("## Logbook");
  });

  it("apunta al sitemap, que es el índice completo", () => {
    expect(renderLlmsTxt([])).toContain("https://www.roahoki.com/sitemap.xml");
  });

  it("termina con un salto de línea", () => {
    expect(renderLlmsTxt([entry()]).endsWith("\n")).toBe(true);
  });
});
