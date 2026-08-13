import { beforeAll, describe, expect, it } from "vitest";
import { asRole, connectTestDb, hasTestDatabase, resetTestDb } from "@/test/db";

/**
 * Tests de integración del esquema de `logbook_entries`, contra Postgres real.
 *
 * Las políticas RLS no se pueden probar con un mock: lo único que demuestra que
 * una política funciona es ejecutar una consulta con el rol al que aplica. Y
 * tiene que ser Postgres de verdad, porque acá se está probando el
 * comportamiento del motor —GIN, checks, unique— y no el de Drizzle.
 */
describe.runIf(hasTestDatabase)("esquema de logbook_entries", () => {
  beforeAll(async () => {
    await resetTestDb();
  });

  async function insertEntry(fields: Record<string, unknown> = {}) {
    const sql = connectTestDb();
    try {
      const row = {
        slug: "una-nota",
        title: "Una nota",
        body_md: "# Hola",
        ...fields,
      };
      const [created] = await sql`insert into logbook_entries ${sql(row)}
        returning *`;
      return created;
    } finally {
      await sql.end();
    }
  }

  describe("columnas y defaults", () => {
    it("aplica los defaults de una nota mínima", async () => {
      const entry = await insertEntry({ slug: `defaults-${Date.now()}` });

      expect(entry.id).toMatch(/^[\da-f-]{36}$/);
      expect(entry.status).toBe("published");
      expect(entry.tags).toEqual([]);
      expect(entry.summary).toBeNull();
      expect(entry.cover_image_url).toBeNull();
      expect(entry.published_at).not.toBeNull();
      expect(entry.created_at).not.toBeNull();
      expect(entry.updated_at).not.toBeNull();
    });

    it("guarda los tags como arreglo", async () => {
      const entry = await insertEntry({
        slug: `tags-${Date.now()}`,
        tags: ["rails", "postgres"],
      });

      expect(entry.tags).toEqual(["rails", "postgres"]);
    });

    // `published_at` está separada de `created_at` para poder fechar una nota
    // en el día que ocurrió lo que cuenta, no en el que se escribió.
    it("permite una published_at distinta de created_at", async () => {
      const entry = await insertEntry({
        slug: `fechada-${Date.now()}`,
        published_at: "2020-01-01T00:00:00Z",
      });

      expect(new Date(entry.published_at).getUTCFullYear()).toBe(2020);
      expect(new Date(entry.created_at).getUTCFullYear()).toBeGreaterThan(2020);
    });
  });

  describe("restricciones", () => {
    it("rechaza un slug duplicado", async () => {
      const slug = `duplicado-${Date.now()}`;
      await insertEntry({ slug });

      await expect(insertEntry({ slug })).rejects.toThrow();
    });

    it("rechaza un slug vacío", async () => {
      await expect(insertEntry({ slug: "" })).rejects.toThrow();
    });

    it("rechaza un status fuera de los dos permitidos", async () => {
      await expect(
        insertEntry({ slug: `estado-${Date.now()}`, status: "archived" }),
      ).rejects.toThrow();
    });

    it.each(["title", "body_md"])("exige %s", async (column) => {
      await expect(
        insertEntry({ slug: `sin-${column}-${Date.now()}`, [column]: null }),
      ).rejects.toThrow();
    });
  });

  describe("índices", () => {
    it("existe el índice GIN sobre tags", async () => {
      const sql = connectTestDb();
      try {
        const [index] = await sql`
          select indexdef from pg_indexes
          where tablename = 'logbook_entries'
            and indexname = 'logbook_entries_tags_idx'
        `;

        // Un B-tree sobre un array indexa el array entero como un valor y no
        // responde "cuáles contienen este tag", que es la consulta del listado
        // por tag de la PR 16.
        expect(index?.indexdef).toContain("USING gin");
      } finally {
        await sql.end();
      }
    });

    it("el índice GIN sirve para la búsqueda por tag", async () => {
      const suffix = Date.now();
      await insertEntry({ slug: `gin-a-${suffix}`, tags: ["rails", "ruby"] });
      await insertEntry({ slug: `gin-b-${suffix}`, tags: ["postgres"] });

      const sql = connectTestDb();
      try {
        const rows = await sql`
          select slug from logbook_entries
          where tags @> ARRAY['rails']::text[] and slug like ${`gin-%-${suffix}`}
        `;

        expect(rows.map((row) => row.slug)).toEqual([`gin-a-${suffix}`]);
      } finally {
        await sql.end();
      }
    });
  });

  /**
   * El caso que el roadmap pide explícitamente.
   *
   * Importa porque Supabase expone una API REST sobre la base con la anon key,
   * y esa clave está en el bundle del browser. Sin esta política, cualquiera
   * puede leer los borradores pegándole directo a la API, sin pasar por la app.
   */
  describe("RLS", () => {
    const suffix = Date.now();

    beforeAll(async () => {
      await insertEntry({
        slug: `publicada-${suffix}`,
        title: "Publicada",
        status: "published",
      });
      await insertEntry({
        slug: `borrador-${suffix}`,
        title: "Borrador",
        status: "draft",
      });
    });

    it("el rol anónimo ve las publicadas", async () => {
      const rows = await asRole(
        "anon",
        (sql) =>
          sql`select slug from logbook_entries where slug = ${`publicada-${suffix}`}`,
      );

      expect(rows).toHaveLength(1);
    });

    it("el rol anónimo NO ve los borradores", async () => {
      const rows = await asRole(
        "anon",
        (sql) =>
          sql`select slug from logbook_entries where slug = ${`borrador-${suffix}`}`,
      );

      expect(rows).toHaveLength(0);
    });

    it("el rol anónimo no puede insertar", async () => {
      await expect(
        asRole(
          "anon",
          (sql) => sql`
            insert into logbook_entries (slug, title, body_md)
            values (${`anon-${suffix}`}, 'Intento', 'x')
          `,
        ),
      ).rejects.toThrow();
    });

    it("el rol anónimo no puede modificar una nota publicada", async () => {
      await asRole(
        "anon",
        (sql) => sql`
          update logbook_entries set title = 'Hackeada'
          where slug = ${`publicada-${suffix}`}
        `,
      );

      const sql = connectTestDb();
      try {
        const [row] = await sql`
          select title from logbook_entries where slug = ${`publicada-${suffix}`}
        `;
        expect(row.title).toBe("Publicada");
      } finally {
        await sql.end();
      }
    });

    it("el rol anónimo no puede borrar", async () => {
      await asRole(
        "anon",
        (sql) =>
          sql`delete from logbook_entries where slug = ${`publicada-${suffix}`}`,
      );

      const sql = connectTestDb();
      try {
        const rows = await sql`
          select 1 from logbook_entries where slug = ${`publicada-${suffix}`}
        `;
        expect(rows).toHaveLength(1);
      } finally {
        await sql.end();
      }
    });

    it("service_role ve todo, incluidos los borradores", async () => {
      const rows = await asRole(
        "service_role",
        (sql) =>
          sql`select slug from logbook_entries where slug like ${`%-${suffix}`}`,
      );

      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
  });
});
