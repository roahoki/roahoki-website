import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  connectTestDb,
  hasTestDatabase,
  resetTestDb,
  testDatabaseUrl,
} from "@/test/db";

/**
 * Integración contra Postgres real.
 *
 * Lo que se está probando de verdad es el filtro `status = 'published'`. Como
 * `getDb()` conecta como dueño de la base y se saltea RLS, ese filtro es la
 * única barrera entre un borrador y la página pública: un mock no demostraría
 * nada porque el filtro es justamente lo que el mock tendría que simular.
 *
 * Mismo montaje que `src/lib/testimonials/queries.test.ts`: `@/db` lee
 * `DATABASE_URL`, así que hay que apuntarla a la base de pruebas **antes** de
 * importar el módulo. De ahí el import dinámico — uno estático se ejecutaría
 * antes que cualquier línea de este archivo.
 */
type Queries = typeof import("./queries");
type GetDb = typeof import("@/db").getDb;

let queries: Queries;
let getDb: GetDb;

const UUID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

describe.skipIf(!hasTestDatabase)("queries del logbook", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await resetTestDb();

    queries = await import("./queries");
    getDb = (await import("@/db")).getDb;
  }, 60_000);

  afterAll(async () => {
    // Sin cerrar el pool, vitest se queda esperando a que el socket muera.
    await getDb().$client.end();
  });

  beforeEach(async () => {
    // Cada test parte de una tabla vacía: varios afirman sobre listados
    // completos y el orden importa.
    const sql = connectTestDb();
    try {
      await sql`delete from logbook_entries`;
    } finally {
      await sql.end();
    }
  });

  async function seed(fields: Record<string, unknown> = {}) {
    return queries.createEntry({
      slug: "una-nota",
      title: "Una nota",
      bodyMd: "cuerpo",
      ...fields,
    });
  }

  describe("createEntry", () => {
    it("crea una nota con los defaults de la base", async () => {
      const entry = await seed();

      expect(entry.id).toMatch(/^[\da-f-]{36}$/);
      expect(entry.status).toBe("published");
      expect(entry.tags).toEqual([]);
    });

    it("guarda los tags", async () => {
      const entry = await seed({ tags: ["rails", "postgres"] });

      expect(entry.tags).toEqual(["rails", "postgres"]);
    });

    it("acepta una fecha de publicación explícita", async () => {
      const entry = await seed({ publishedAt: "2020-05-05T00:00:00Z" });

      expect(new Date(entry.publishedAt).getUTCFullYear()).toBe(2020);
    });
  });

  describe("listPublishedEntries", () => {
    it("no incluye los borradores", async () => {
      await seed({ slug: "publicada", status: "published" });
      await seed({ slug: "borrador", status: "draft" });

      const entries = await queries.listPublishedEntries();

      expect(entries.map((e) => e.slug)).toEqual(["publicada"]);
    });

    it("ordena de la más nueva a la más vieja", async () => {
      await seed({ slug: "vieja", publishedAt: "2020-01-01T00:00:00Z" });
      await seed({ slug: "nueva", publishedAt: "2026-01-01T00:00:00Z" });
      await seed({ slug: "media", publishedAt: "2023-01-01T00:00:00Z" });

      const entries = await queries.listPublishedEntries();

      expect(entries.map((e) => e.slug)).toEqual(["nueva", "media", "vieja"]);
    });

    it("respeta el límite", async () => {
      await seed({ slug: "a", publishedAt: "2026-01-01T00:00:00Z" });
      await seed({ slug: "b", publishedAt: "2025-01-01T00:00:00Z" });

      expect(await queries.listPublishedEntries(1)).toHaveLength(1);
    });

    it("devuelve vacío cuando no hay nada", async () => {
      expect(await queries.listPublishedEntries()).toEqual([]);
    });
  });

  describe("getPublishedEntryBySlug", () => {
    it("encuentra una nota publicada", async () => {
      await seed({ slug: "encontrable" });

      const entry = await queries.getPublishedEntryBySlug("encontrable");

      expect(entry?.slug).toBe("encontrable");
    });

    // Si el filtro viviera en la página, /logbook/un-borrador devolvería la
    // nota y la vista tendría que acordarse de esconderla.
    it("NO encuentra un borrador", async () => {
      await seed({ slug: "oculta", status: "draft" });

      expect(await queries.getPublishedEntryBySlug("oculta")).toBeUndefined();
    });

    it("devuelve undefined si el slug no existe", async () => {
      expect(
        await queries.getPublishedEntryBySlug("no-existe"),
      ).toBeUndefined();
    });
  });

  describe("listAllEntries", () => {
    it("incluye los borradores, porque es para el panel", async () => {
      await seed({ slug: "publicada", status: "published" });
      await seed({ slug: "borrador", status: "draft" });

      expect(await queries.listAllEntries()).toHaveLength(2);
    });
  });

  describe("getEntryById", () => {
    it("encuentra un borrador por id", async () => {
      const created = await seed({ slug: "borrador", status: "draft" });

      expect((await queries.getEntryById(created.id))?.slug).toBe("borrador");
    });

    it("devuelve undefined para un id que no existe", async () => {
      expect(await queries.getEntryById(UUID_INEXISTENTE)).toBeUndefined();
    });
  });

  describe("availableSlugFor", () => {
    it("deriva el slug del título", async () => {
      expect(await queries.availableSlugFor("Programación en Rails")).toBe(
        "programacion-en-rails",
      );
    });

    it("agrega sufijo cuando el slug ya existe", async () => {
      await seed({ slug: "una-nota" });

      expect(await queries.availableSlugFor("Una nota")).toBe("una-nota-2");
    });

    it("sigue subiendo con varias colisiones", async () => {
      await seed({ slug: "una-nota" });
      await seed({ slug: "una-nota-2" });

      expect(await queries.availableSlugFor("Una nota")).toBe("una-nota-3");
    });

    it("no colisiona con un slug que solo comparte prefijo", async () => {
      await seed({ slug: "nota-larga" });

      expect(await queries.availableSlugFor("Nota")).toBe("nota");
    });

    // El handler tiene que pedir un slug a mano en este caso.
    it("devuelve cadena vacía si el título no da nada usable", async () => {
      expect(await queries.availableSlugFor("🚀🎉")).toBe("");
    });
  });

  describe("updateEntry", () => {
    it("actualiza solo los campos dados", async () => {
      const created = await seed({ slug: "original", title: "Original" });

      const updated = await queries.updateEntry(created.id, {
        title: "Cambiado",
      });

      expect(updated?.title).toBe("Cambiado");
      expect(updated?.slug).toBe("original");
    });

    it("mueve una nota a borrador", async () => {
      const created = await seed();

      expect(
        (await queries.updateEntry(created.id, { status: "draft" }))?.status,
      ).toBe("draft");
    });

    // `updatedAt` lo pone la query y no el llamador: es la clase de campo que
    // se olvida en uno de los lugares que actualizan y entonces miente.
    it("adelanta updatedAt", async () => {
      const created = await seed();
      const before = new Date(created.updatedAt).getTime();

      const updated = await queries.updateEntry(created.id, { title: "Otro" });

      expect(
        new Date(updated?.updatedAt ?? 0).getTime(),
      ).toBeGreaterThanOrEqual(before);
    });

    it("devuelve undefined si el id no existe", async () => {
      expect(
        await queries.updateEntry(UUID_INEXISTENTE, { title: "x" }),
      ).toBeUndefined();
    });

    it("propaga la violación de unicidad del slug", async () => {
      await seed({ slug: "ocupado" });
      const otra = await seed({ slug: "libre" });

      await expect(
        queries.updateEntry(otra.id, { slug: "ocupado" }),
      ).rejects.toThrow();
    });
  });

  describe("deleteEntry", () => {
    it("borra y devuelve true", async () => {
      const created = await seed();

      expect(await queries.deleteEntry(created.id)).toBe(true);
      expect(await queries.getEntryById(created.id)).toBeUndefined();
    });

    it("devuelve false si el id no existía", async () => {
      expect(await queries.deleteEntry(UUID_INEXISTENTE)).toBe(false);
    });
  });

  describe("listPublishedSlugs", () => {
    it("devuelve solo los publicados, en orden", async () => {
      await seed({ slug: "nueva", publishedAt: "2026-01-01T00:00:00Z" });
      await seed({ slug: "vieja", publishedAt: "2020-01-01T00:00:00Z" });
      await seed({ slug: "borrador", status: "draft" });

      expect(await queries.listPublishedSlugs()).toEqual(["nueva", "vieja"]);
    });
  });

  describe("el índice GIN responde la búsqueda por tag", () => {
    it("filtra por tag", async () => {
      await seed({ slug: "con-rails", tags: ["rails", "ruby"] });
      await seed({ slug: "sin-rails", tags: ["postgres"] });

      const sql = connectTestDb();
      try {
        const rows = await sql`
          select slug from logbook_entries
          where tags @> ARRAY['rails']::text[]
        `;
        expect(rows.map((r) => r.slug)).toEqual(["con-rails"]);
      } finally {
        await sql.end();
      }
    });
  });
});
