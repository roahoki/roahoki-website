import { describe, expect, it } from "vitest";
import {
  BIRTHDAY_EVENTS,
  DEFAULT_INVITED_EVENTS,
  EVENT_SLUGS,
  eventByPath,
  eventBySlug,
  eventsFor,
  hasPassed,
  isEventSlug,
} from "./events";

describe("catálogo de planes", () => {
  it("tiene un plan por cada slug, sin repetir", () => {
    expect(BIRTHDAY_EVENTS.map((event) => event.slug).sort()).toEqual(
      [...EVENT_SLUGS].sort(),
    );
    const paths = BIRTHDAY_EVENTS.map((event) => event.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("está en orden cronológico, que es el orden del lineup", () => {
    const starts = BIRTHDAY_EVENTS.map((event) => Date.parse(event.startsAt));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(BIRTHDAY_EVENTS.map((event) => event.slug)).toEqual([
      "cocktail",
      "run",
      "party",
      "hike",
    ]);
  });

  it("termina cada plan después de empezar", () => {
    for (const event of BIRTHDAY_EVENTS) {
      expect(Date.parse(event.endsAt)).toBeGreaterThan(
        Date.parse(event.startsAt),
      );
    }
  });

  it("escribe los títulos en minúscula, como pide el brand book", () => {
    for (const event of BIRTHDAY_EVENTS) {
      expect(event.title).toBe(event.title.toLowerCase());
    }
  });

  it("no usa guiones largos en ningún texto", () => {
    for (const event of BIRTHDAY_EVENTS) {
      const texts = [
        event.title,
        event.place,
        event.question,
        ...event.details.flatMap((detail) => [detail.label, detail.value]),
      ];
      for (const text of texts) expect(text).not.toMatch(/[—–]/);
    }
  });

  it("invita por defecto a todo menos al cóctel", () => {
    expect(DEFAULT_INVITED_EVENTS).toEqual(["run", "party", "hike"]);
  });

  it("encuentra un plan por slug y por segmento de URL", () => {
    expect(eventBySlug("run").path).toBe("trote");
    expect(eventByPath("manquehue")?.slug).toBe("hike");
    expect(eventByPath("cocktail")).toBeUndefined();
  });

  it("reconoce solo los slugs del catálogo", () => {
    expect(isEventSlug("party")).toBe(true);
    expect(isEventSlug("carrete")).toBe(false);
    expect(isEventSlug(undefined)).toBe(false);
  });

  it("devuelve los planes de un invitado en orden cronológico", () => {
    expect(eventsFor(["hike", "run"]).map((event) => event.slug)).toEqual([
      "run",
      "hike",
    ]);
  });
});

describe("hasPassed", () => {
  const party = eventBySlug("party");

  it("no da por pasado un plan el mismo día en que termina", () => {
    // El carrete termina el domingo a las 05:00; el domingo en la noche sigue.
    expect(hasPassed(party, new Date("2026-11-08T23:59:00-03:00"))).toBe(false);
  });

  it("lo da por pasado desde la medianoche siguiente, hora de Santiago", () => {
    expect(hasPassed(party, new Date("2026-11-09T00:00:00-03:00"))).toBe(true);
  });

  it("no da por pasado un plan que no ha empezado", () => {
    expect(
      hasPassed(eventBySlug("cocktail"), new Date("2026-10-28T12:00:00Z")),
    ).toBe(false);
  });
});
