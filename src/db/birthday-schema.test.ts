import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EVENT_SLUGS } from "@/lib/birthday/events";
import { asRole, connectTestDb, hasTestDatabase, resetTestDb } from "@/test/db";

/**
 * Tests de integración del esquema del cumpleaños, contra Postgres real.
 *
 * Lo que se prueba es lo que sostiene la base aunque el código se equivoque:
 * los checks contra el catálogo de TypeScript, el formato del token y que con
 * la anon key no se lee nada. Un mock afirmaría sobre el mock.
 */
describe.runIf(hasTestDatabase)("esquema del cumpleaños", () => {
  beforeAll(async () => {
    await resetTestDb();
  });

  beforeEach(async () => {
    const sql = connectTestDb();
    try {
      await sql`delete from birthday_event_albums`;
      await sql`delete from birthday_guests`;
    } finally {
      await sql.end();
    }
  });

  let counter = 0;
  async function insertGuest(fields: Record<string, unknown> = {}) {
    const sql = connectTestDb();
    try {
      counter++;
      const row = {
        name: "cata",
        token: `Tok${String(counter).padStart(9, "0")}`,
        ...fields,
      };
      const [created] =
        await sql`insert into birthday_guests ${sql(row)} returning *`;
      return created;
    } finally {
      await sql.end();
    }
  }

  async function insertRsvp(fields: Record<string, unknown>) {
    const sql = connectTestDb();
    try {
      const [created] =
        await sql`insert into birthday_rsvps ${sql(fields)} returning *`;
      return created;
    } finally {
      await sql.end();
    }
  }

  describe("birthday_guests", () => {
    it("invita por defecto a todo menos al cóctel", async () => {
      const guest = await insertGuest();
      expect(guest.invited_events).toEqual(["run", "party", "hike"]);
      expect(guest.roki).toBeNull();
      expect(guest.scratched_at).toBeNull();
    });

    it("acepta todos los planes del catálogo de TypeScript", async () => {
      const guest = await insertGuest({ invited_events: [...EVENT_SLUGS] });
      expect(guest.invited_events).toEqual([...EVENT_SLUGS]);
    });

    it("rechaza un plan que no está en el catálogo", async () => {
      await expect(
        insertGuest({ invited_events: ["run", "asado"] }),
      ).rejects.toMatchObject({
        constraint_name: "birthday_guests_invited_events_check",
      });
    });

    it("rechaza un invitado sin planes", async () => {
      await expect(insertGuest({ invited_events: [] })).rejects.toMatchObject({
        constraint_name: "birthday_guests_invited_events_check",
      });
    });

    it("rechaza un token corto o con otros caracteres", async () => {
      await expect(insertGuest({ token: "corto" })).rejects.toMatchObject({
        constraint_name: "birthday_guests_token_format",
      });
      await expect(
        insertGuest({ token: "abc-def_ghij" }),
      ).rejects.toMatchObject({
        constraint_name: "birthday_guests_token_format",
      });
    });

    it("no deja repetir un token", async () => {
      await insertGuest({ token: "AAAAAAAAAAAA" });
      await expect(
        insertGuest({ token: "AAAAAAAAAAAA" }),
      ).rejects.toMatchObject({ constraint_name: "birthday_guests_token_key" });
    });

    it("rechaza un nombre vacío", async () => {
      await expect(insertGuest({ name: "  " })).rejects.toMatchObject({
        constraint_name: "birthday_guests_name_not_empty",
      });
    });

    it("guarda el roki como jsonb y lo devuelve como objeto", async () => {
      const roki = {
        strokes: [
          {
            color: "#C42B1C",
            points: [
              [0.1, 0.2],
              [0.3, 0.4],
            ],
          },
        ],
        eye: 0,
      };
      const sql = connectTestDb();
      try {
        const guest = await insertGuest();
        const [row] = await sql`
          update birthday_guests set roki = ${sql.json(roki)}
          where id = ${guest.id} returning roki`;
        expect(row.roki).toEqual(roki);
      } finally {
        await sql.end();
      }
    });
  });

  describe("birthday_rsvps", () => {
    it("guarda una respuesta por invitado y plan", async () => {
      const guest = await insertGuest();
      await insertRsvp({
        guest_id: guest.id,
        event_slug: "run",
        status: "going",
      });
      await expect(
        insertRsvp({
          guest_id: guest.id,
          event_slug: "run",
          status: "not_going",
        }),
      ).rejects.toMatchObject({ code: "23505" });
    });

    it("rechaza planes y estados que no existen", async () => {
      const guest = await insertGuest();
      await expect(
        insertRsvp({
          guest_id: guest.id,
          event_slug: "asado",
          status: "going",
        }),
      ).rejects.toMatchObject({
        constraint_name: "birthday_rsvps_event_slug_check",
      });
      await expect(
        insertRsvp({ guest_id: guest.id, event_slug: "run", status: "maybe" }),
      ).rejects.toMatchObject({
        constraint_name: "birthday_rsvps_status_check",
      });
    });

    it("borra las respuestas al borrar al invitado", async () => {
      const guest = await insertGuest();
      await insertRsvp({
        guest_id: guest.id,
        event_slug: "run",
        status: "going",
      });
      const sql = connectTestDb();
      try {
        await sql`delete from birthday_guests where id = ${guest.id}`;
        const rows = await sql`select 1 from birthday_rsvps`;
        expect(rows).toHaveLength(0);
      } finally {
        await sql.end();
      }
    });
  });

  describe("birthday_event_albums", () => {
    it("acepta un link https y rechaza cualquier otro", async () => {
      const sql = connectTestDb();
      try {
        await sql`insert into birthday_event_albums (event_slug, url)
          values ('party', 'https://www.icloud.com/sharedalbum/#B0abc')`;
        await expect(
          sql`insert into birthday_event_albums (event_slug, url)
            values ('run', 'javascript:alert(1)')`,
        ).rejects.toMatchObject({
          constraint_name: "birthday_event_albums_url_https",
        });
      } finally {
        await sql.end();
      }
    });
  });

  describe("RLS", () => {
    it("no deja leer ni escribir nada con la anon key", async () => {
      await insertGuest();
      for (const table of [
        "birthday_guests",
        "birthday_rsvps",
        "birthday_event_albums",
      ]) {
        const rows = await asRole(
          "anon",
          (sql) => sql`select * from ${sql(table)}`,
        );
        expect(rows).toHaveLength(0);
      }
      await expect(
        asRole(
          "anon",
          (sql) =>
            sql`insert into birthday_guests (name, token) values ('intruso', 'XXXXXXXXXXXX')`,
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });

    it("deja todo al service role", async () => {
      await insertGuest();
      const rows = await asRole(
        "service_role",
        (sql) => sql`select * from birthday_guests`,
      );
      expect(rows).toHaveLength(1);
    });
  });
});
