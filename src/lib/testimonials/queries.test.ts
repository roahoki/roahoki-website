import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  connectTestDb,
  hasTestDatabase,
  resetTestDb,
  testDatabaseUrl,
} from "@/test/db";

/**
 * Las queries se prueban contra un Postgres de verdad, no contra un mock: un
 * mock devolvería lo que se le pidiera y no diría nada sobre si el filtro
 * `status = 'approved'` o el `order by` están bien escritos, que es justamente
 * lo único que estas funciones hacen.
 *
 * `@/db` lee `DATABASE_URL` al evaluarse el módulo, así que hay que apuntarla a
 * la base de pruebas **antes** de importarlo. De ahí el import dinámico: un
 * import estático se ejecuta antes que cualquier línea de este archivo.
 */

type Queries = typeof import("./queries");
type Db = typeof import("@/db").db;

let queries: Queries;
let db: Db;

const UUID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

describe.skipIf(!hasTestDatabase)("queries de testimonials", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await resetTestDb();

    queries = await import("./queries");
    db = (await import("@/db")).db;
  }, 60_000);

  afterAll(async () => {
    // Sin cerrar el pool, vitest se queda esperando a que el socket muera.
    await db.$client.end();
  });

  beforeEach(async () => {
    const sql = connectTestDb();
    try {
      await sql`delete from testimonials`;
      await sql`
        insert into testimonials (name, message, status, email, created_at) values
          ('Aprobado viejo',  'testimonio aprobado mas antiguo', 'approved', 'v@example.com', '2026-01-01T00:00:00Z'),
          ('Aprobado nuevo',  'testimonio aprobado mas reciente','approved', 'n@example.com', '2026-06-01T00:00:00Z'),
          ('Pendiente',       'testimonio aun sin moderar',      'pending',  'p@example.com', '2026-03-01T00:00:00Z'),
          ('Rechazado',       'testimonio que fue rechazado',    'rejected', 'r@example.com', '2026-04-01T00:00:00Z')
      `;
    } finally {
      await sql.end();
    }
  });

  describe("listApprovedTestimonials", () => {
    it("deja fuera los pendientes y los rechazados", async () => {
      const rows = await queries.listApprovedTestimonials();

      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.status === "approved")).toBe(true);
    });

    it("ordena del más nuevo al más viejo", async () => {
      const rows = await queries.listApprovedTestimonials();

      expect(rows.map((r) => r.name)).toEqual([
        "Aprobado nuevo",
        "Aprobado viejo",
      ]);
    });

    it("respeta el límite cuando se le pasa uno", async () => {
      const rows = await queries.listApprovedTestimonials(1);

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Aprobado nuevo");
    });

    it("mapea las columnas snake_case a las propiedades del esquema", async () => {
      const [row] = await queries.listApprovedTestimonials(1);

      // El tipo se infiere del esquema, así que un cambio de nombre de columna
      // rompería la compilación; esto cubre el mapeo en runtime.
      expect(row).toHaveProperty("createdAt");
      expect(row).toHaveProperty("imageUrl");
      expect(row).not.toHaveProperty("created_at");
    });
  });

  describe("listAllTestimonials", () => {
    it("trae los cuatro, sin filtrar por estado", async () => {
      const rows = await queries.listAllTestimonials();

      expect(rows).toHaveLength(4);
      expect(new Set(rows.map((r) => r.status))).toEqual(
        new Set(["approved", "pending", "rejected"]),
      );
    });

    it("ordena del más nuevo al más viejo", async () => {
      const rows = await queries.listAllTestimonials();

      expect(rows.map((r) => r.name)).toEqual([
        "Aprobado nuevo",
        "Rechazado",
        "Pendiente",
        "Aprobado viejo",
      ]);
    });
  });

  describe("createTestimonial", () => {
    it("guarda el testimonio y lo devuelve con su id", async () => {
      const created = await queries.createTestimonial({
        name: "Nuevo",
        message: "un testimonio recién llegado",
        email: "nuevo@example.com",
      });

      expect(created.id).toBeTruthy();
      expect(created.name).toBe("Nuevo");
      await expect(queries.listAllTestimonials()).resolves.toHaveLength(5);
    });

    // Este es el assert que importa: si el estado se pudiera elegir desde
    // afuera, el formulario público podría publicar sin pasar por moderación.
    it("lo deja en pending, no en approved", async () => {
      const created = await queries.createTestimonial({
        name: "Nuevo",
        message: "un testimonio recién llegado",
        email: "nuevo@example.com",
      });

      expect(created.status).toBe("pending");
      await expect(queries.listApprovedTestimonials()).resolves.toHaveLength(2);
    });
  });

  describe("updateTestimonialStatus", () => {
    it("cambia el estado y devuelve la fila actualizada", async () => {
      const [pendiente] = (await queries.listAllTestimonials()).filter(
        (r) => r.status === "pending",
      );

      const updated = await queries.updateTestimonialStatus(
        pendiente.id,
        "approved",
      );

      expect(updated?.status).toBe("approved");
      await expect(queries.listApprovedTestimonials()).resolves.toHaveLength(3);
    });

    it("devuelve undefined si el id no existe", async () => {
      const updated = await queries.updateTestimonialStatus(
        UUID_INEXISTENTE,
        "approved",
      );

      expect(updated).toBeUndefined();
    });
  });

  describe("deleteTestimonial", () => {
    it("borra la fila y devuelve true", async () => {
      const [primero] = await queries.listAllTestimonials();

      await expect(queries.deleteTestimonial(primero.id)).resolves.toBe(true);
      await expect(queries.listAllTestimonials()).resolves.toHaveLength(3);
    });

    it("devuelve false si el id no existe", async () => {
      await expect(queries.deleteTestimonial(UUID_INEXISTENTE)).resolves.toBe(
        false,
      );
      await expect(queries.listAllTestimonials()).resolves.toHaveLength(4);
    });
  });
});
