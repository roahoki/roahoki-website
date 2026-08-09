import { beforeAll, describe, expect, it } from "vitest";
import { asRole, connectTestDb, hasTestDatabase, resetTestDb } from "@/test/db";

/**
 * Verifica que el esquema versionado en el repo reproduce la base real.
 *
 * El punto de partida salió de `drizzle-kit pull`, y la introspección **perdió
 * la cláusula `using` de la política de lectura pública**: generó
 *
 *   CREATE POLICY "public can read approved" ... FOR SELECT TO "anon";
 *
 * cuando en producción la política es `using (status = 'approved')`. Aplicar la
 * versión generada habría dejado los testimonios pendientes y rechazados —con
 * los correos de esas personas— legibles por cualquiera con la anon key, que es
 * pública por diseño.
 *
 * Se corrigió a mano, y estos tests existen para que no vuelva a colarse: el
 * riesgo real no es que la política falte, es que exista con el nombre correcto
 * y no filtre nada.
 */
describe.skipIf(!hasTestDatabase)("esquema de testimonials", () => {
  beforeAll(async () => {
    await resetTestDb();
  }, 60_000);

  it("crea la tabla con sus 9 columnas", async () => {
    const sql = connectTestDb();
    try {
      const columns = await sql<{ column_name: string }[]>`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'testimonials'
      `;
      expect(columns.map((c) => c.column_name).sort()).toEqual([
        "created_at",
        "email",
        "github_username",
        "id",
        "image_url",
        "linkedin_url",
        "message",
        "name",
        "status",
      ]);
    } finally {
      await sql.end();
    }
  });

  it("deja RLS habilitada", async () => {
    const sql = connectTestDb();
    try {
      const [row] = await sql<{ relrowsecurity: boolean }[]>`
        select relrowsecurity from pg_class where relname = 'testimonials'
      `;
      expect(row.relrowsecurity).toBe(true);
    } finally {
      await sql.end();
    }
  });

  it("restringe status a los tres valores válidos", async () => {
    const sql = connectTestDb();
    try {
      await expect(
        sql`insert into testimonials (name, message, status)
            values ('Test', 'mensaje de prueba', 'cualquier_cosa')`,
      ).rejects.toThrow(/testimonials_status_check/);
    } finally {
      await sql.end();
    }
  });

  describe("política de lectura pública", () => {
    beforeAll(async () => {
      const sql = connectTestDb();
      try {
        await sql`delete from testimonials`;
        await sql`
          insert into testimonials (name, message, status, email) values
            ('Aprobado',  'testimonio visible para todos', 'approved', 'a@example.com'),
            ('Pendiente', 'testimonio aun sin moderar',    'pending',  'p@example.com'),
            ('Rechazado', 'testimonio que fue rechazado',  'rejected', 'r@example.com')
        `;
      } finally {
        await sql.end();
      }
    });

    it("el rol anon solo ve los aprobados", async () => {
      const rows = await asRole(
        "anon",
        (tx) => tx<{ name: string; status: string }[]>`
          select name, status from testimonials
        `,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("approved");
    });

    it("el rol anon no puede leer correos de no aprobados", async () => {
      const rows = await asRole(
        "anon",
        (tx) => tx<{ email: string | null }[]>`
          select email from testimonials where status <> 'approved'
        `,
      );

      expect(rows).toHaveLength(0);
    });

    // Los dos asserts anteriores se cumplen igual si la política bloquea TODO,
    // que es justo lo que pasa cuando falta `using`. Este exige además que lo
    // aprobado sí se vea: cubre el fallo en ambas direcciones —de más y de
    // menos— y es el que delata una política rota por omisión.
    it("lo aprobado sigue siendo legible, no solo lo demás oculto", async () => {
      const rows = await asRole(
        "anon",
        (tx) => tx<{ name: string; email: string | null }[]>`
          select name, email from testimonials
        `,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Aprobado");
      expect(rows[0].email).toBe("a@example.com");
    });

    it("service_role ve los tres", async () => {
      const rows = await asRole(
        "service_role",
        (tx) => tx<{ id: string }[]>`select id from testimonials`,
      );

      expect(rows).toHaveLength(3);
    });
  });
});
