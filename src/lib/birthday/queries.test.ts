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
 * Lo que más importa probar es la regla que sostiene `setRsvp` y ninguna otra
 * capa: un invitado no puede responder un plan al que no está invitado. Y que
 * quitarle un plan desde el panel lo saque de la pila.
 *
 * Mismo montaje que `src/lib/stats/queries.test.ts`: `@/db` lee `DATABASE_URL`
 * al importarse, así que se apunta a la base de pruebas antes del import.
 */
type Queries = typeof import("./queries");
type GetDb = typeof import("@/db").getDb;

let queries: Queries;
let getDb: GetDb;

const ROKI = {
  strokes: [
    {
      color: "#C42B1C" as const,
      points: [
        [0.1, 0.2],
        [0.3, 0.4],
      ] as [number, number][],
    },
  ],
  eye: 0,
};

describe.skipIf(!hasTestDatabase)("queries del cumpleaños", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await resetTestDb();
    queries = await import("./queries");
    getDb = (await import("@/db")).getDb;
  }, 60_000);

  afterAll(async () => {
    await getDb().$client.end();
  });

  beforeEach(async () => {
    const sql = connectTestDb();
    try {
      await sql`delete from birthday_event_albums`;
      await sql`delete from birthday_event_texts`;
      await sql`delete from birthday_questions`;
      await sql`delete from birthday_guests`;
    } finally {
      await sql.end();
    }
  });

  function guest(name: string, invitedEvents = ["run", "party", "hike"]) {
    return queries.createGuest({
      name,
      invitedEvents: invitedEvents as ("cocktail" | "run" | "party" | "hike")[],
    });
  }

  describe("invitados", () => {
    it("crea un invitado con un token válido", async () => {
      const cata = await queries.createGuest({
        name: "cata",
        phone: "+56 9 8765 4321",
        personalMessage: "te espero",
        invitedEvents: ["run"],
      });
      expect(cata.token).toMatch(/^[0-9A-Za-z]{12}$/);
      expect(cata.invitedEvents).toEqual(["run"]);
      expect((await queries.getGuestByToken(cata.token))?.id).toBe(cata.id);
    });

    it("regenera el token y deja muerto el anterior", async () => {
      const cata = await guest("cata");
      await queries.setRsvp(cata.id, "run", "going");
      const renewed = await queries.regenerateToken(cata.id);

      expect(renewed?.token).not.toBe(cata.token);
      expect(await queries.getGuestByToken(cata.token)).toBeUndefined();
      // Sus respuestas siguen: regenerar no la desinscribe de nada.
      expect(await queries.rsvpsOf(cata.id)).toEqual({ run: "going" });
    });

    it("anota la primera visita una sola vez y la última cada vez", async () => {
      const cata = await guest("cata");
      await queries.recordVisit(cata.id, new Date("2026-10-29T10:00:00Z"));
      await queries.recordVisit(cata.id, new Date("2026-10-30T18:00:00Z"));

      const seen = await queries.getGuestById(cata.id);
      expect(new Date(seen?.firstSeenAt ?? "").toISOString()).toBe(
        "2026-10-29T10:00:00.000Z",
      );
      expect(new Date(seen?.lastSeenAt ?? "").toISOString()).toBe(
        "2026-10-30T18:00:00.000Z",
      );
    });

    it("guarda la fecha en que raspó solo la primera vez", async () => {
      const cata = await guest("cata");
      await queries.markScratched(cata.token, new Date("2026-10-29T10:00:00Z"));
      await queries.markScratched(cata.token, new Date("2026-10-31T10:00:00Z"));

      const seen = await queries.getGuestById(cata.id);
      expect(new Date(seen?.scratchedAt ?? "").toISOString()).toBe(
        "2026-10-29T10:00:00.000Z",
      );
      expect(await queries.markScratched("NoExiste0000")).toBe(false);
    });

    it("guarda y borra su roki", async () => {
      const cata = await guest("cata");
      await queries.saveRoki(cata.id, ROKI);
      expect((await queries.getGuestById(cata.id))?.roki).toEqual(ROKI);
      await queries.saveRoki(cata.id, null);
      expect((await queries.getGuestById(cata.id))?.roki).toBeNull();
    });

    it("lista a todos con sus respuestas, por nombre", async () => {
      const vale = await guest("vale");
      const cata = await guest("cata");
      await queries.setRsvp(vale.id, "run", "going");
      await queries.setRsvp(vale.id, "hike", "not_going");

      const list = await queries.listGuests();
      expect(list.map((g) => g.name)).toEqual(["cata", "vale"]);
      expect(list.find((g) => g.id === vale.id)?.rsvps).toEqual({
        run: "going",
        hike: "not_going",
      });
      expect(list.find((g) => g.id === cata.id)?.rsvps).toEqual({});
    });

    it("borra al invitado con sus respuestas", async () => {
      const cata = await guest("cata");
      await queries.setRsvp(cata.id, "run", "going");
      expect(await queries.deleteGuest(cata.id)).toBe(true);
      expect(await queries.attendeesOf("run")).toEqual([]);
      expect(await queries.deleteGuest(cata.id)).toBe(false);
    });
  });

  describe("setRsvp", () => {
    it("rechaza un plan al que no está invitado", async () => {
      // El caso que importa: el cóctel no viene por defecto, y armar la
      // petición a mano no tiene que alcanzar para anotarse.
      const cata = await guest("cata");
      expect(await queries.setRsvp(cata.id, "cocktail", "going")).toBe(
        "not_invited",
      );
      expect(await queries.rsvpsOf(cata.id)).toEqual({});
    });

    it("cambia de opinión sobre la misma fila", async () => {
      const cata = await guest("cata");
      await queries.setRsvp(cata.id, "run", "going");
      await queries.setRsvp(cata.id, "run", "not_going");
      expect(await queries.rsvpsOf(cata.id)).toEqual({ run: "not_going" });
    });

    it("vuelve a sin responder con null", async () => {
      const cata = await guest("cata");
      await queries.setRsvp(cata.id, "run", "going");
      await queries.setRsvp(cata.id, "run", null);
      expect(await queries.rsvpsOf(cata.id)).toEqual({});
    });

    it("avisa si el invitado no existe", async () => {
      expect(
        await queries.setRsvp(
          "00000000-0000-0000-0000-000000000000",
          "run",
          "going",
        ),
      ).toBe("not_found");
    });
  });

  describe("attendeesOf", () => {
    it("trae solo a quienes van, en el orden en que confirmaron", async () => {
      const cata = await guest("cata");
      const vale = await guest("vale");
      const nico = await guest("nico");
      await queries.setRsvp(
        vale.id,
        "run",
        "going",
        new Date("2026-10-29T10:00:00Z"),
      );
      await queries.setRsvp(
        cata.id,
        "run",
        "going",
        new Date("2026-10-29T11:00:00Z"),
      );
      await queries.setRsvp(nico.id, "run", "not_going");
      await queries.saveRoki(cata.id, ROKI);

      const attendees = await queries.attendeesOf("run");
      expect(attendees.map((a) => a.name)).toEqual(["vale", "cata"]);
      expect(attendees[1].roki).toEqual(ROKI);
    });

    it("saca de la pila a quien le quitaron el plan", async () => {
      const cata = await guest("cata");
      await queries.setRsvp(cata.id, "hike", "going");
      await queries.updateGuest(cata.id, {
        name: "cata",
        invitedEvents: ["run", "party"],
      });

      expect(await queries.attendeesOf("hike")).toEqual([]);
      // Y la respuesta se borró, para que no reaparezca si la vuelven a invitar.
      expect(await queries.rsvpsOf(cata.id)).toEqual({});
    });
  });

  describe("álbumes", () => {
    it("pega, reemplaza y quita el álbum de un plan", async () => {
      await queries.setAlbum(
        "party",
        "https://www.icloud.com/sharedalbum/#B0a",
      );
      await queries.setAlbum(
        "party",
        "https://www.icloud.com/sharedalbum/#B0b",
      );
      expect(await queries.albums()).toEqual({
        party: "https://www.icloud.com/sharedalbum/#B0b",
      });
      await queries.setAlbum("party", null);
      expect(await queries.albums()).toEqual({});
    });
  });

  describe("textos de los planes", () => {
    it("guarda, reemplaza y vuelve a los originales", async () => {
      expect(await queries.eventTexts()).toEqual({});
      const texts = {
        question: "¿vas?",
        details: [{ label: "¿me puedo quedar?", value: "sí" }],
      };
      await queries.setEventTexts("party", texts);
      await queries.setEventTexts("party", { ...texts, question: "¿vienes?" });
      expect(await queries.eventTexts()).toEqual({
        party: { ...texts, question: "¿vienes?" },
      });
      await queries.setEventTexts("party", null);
      expect(await queries.eventTexts()).toEqual({});
    });
  });

  describe("dudas", () => {
    it("cada invitado ve las respondidas y las suyas, no las pendientes de otros", async () => {
      const cata = await guest("cata");
      const vale = await guest("vale");
      const mine = await queries.askQuestion(cata.id, "party", "¿dormir?");
      const other = await queries.askQuestion(vale.id, "party", "¿hielo?");
      await queries.createFaq("party", "¿a qué hora?", "21:00");
      if (mine.status !== "saved" || other.status !== "saved")
        throw new Error("no se guardaron");

      const forCata = await queries.questionsForGuest(cata.id, [
        "party",
        "run",
      ]);
      expect(forCata.party?.map((q) => [q.question, q.mine])).toEqual([
        ["¿a qué hora?", false],
        ["¿dormir?", true],
      ]);
      expect(forCata.run).toBeUndefined();

      await queries.answerQuestion(other.question.id, "trae");
      const after = await queries.questionsForGuest(cata.id, ["party"]);
      // Respondidas en el orden en que se preguntaron; la pendiente al final.
      expect(after.party?.map((q) => q.question)).toEqual([
        "¿hielo?",
        "¿a qué hora?",
        "¿dormir?",
      ]);
    });

    it("frena al cuarto pendiente del mismo invitado en el mismo plan", async () => {
      const cata = await guest("cata");
      for (const text of ["¿uno?", "¿dos?", "¿tres?"]) {
        expect((await queries.askQuestion(cata.id, "party", text)).status).toBe(
          "saved",
        );
      }
      expect(
        (await queries.askQuestion(cata.id, "party", "¿cuatro?")).status,
      ).toBe("too_many");
      // En otro plan sí puede.
      expect(
        (await queries.askQuestion(cata.id, "run", "¿ritmo?")).status,
      ).toBe("saved");
    });

    it("el panel ve todo, primero lo pendiente, y cuenta por plan", async () => {
      const cata = await guest("cata");
      await queries.createFaq("party", "¿a qué hora?", "21:00");
      await queries.askQuestion(cata.id, "party", "¿dormir?");
      const list = await queries.questionsOf("party");
      expect(list.map((q) => [q.question, q.guestName])).toEqual([
        ["¿dormir?", "cata"],
        ["¿a qué hora?", null],
      ]);
      expect(await queries.pendingQuestionCounts()).toEqual({ party: 1 });

      expect(await queries.deleteQuestion(list[0].id)).toBe(true);
      expect(await queries.pendingQuestionCounts()).toEqual({});
    });

    it("las dudas de un invitado se van con él", async () => {
      const cata = await guest("cata");
      await queries.askQuestion(cata.id, "party", "¿dormir?");
      await queries.deleteGuest(cata.id);
      expect(await queries.questionsOf("party")).toEqual([]);
    });
  });
});
