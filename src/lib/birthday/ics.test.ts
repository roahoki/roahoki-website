import { describe, expect, it } from "vitest";
import { eventBySlug } from "./events";
import { eventIcs } from "./ics";

const ics = eventIcs({
  event: eventBySlug("party"),
  guestId: "g1",
  url: "https://www.roahoki.com/cumple/Ab3dEf6hIj9L/carrete",
  now: new Date("2026-10-28T12:00:00Z"),
});

describe("eventIcs", () => {
  it("convierte las horas de Santiago a UTC", () => {
    expect(ics).toContain("DTSTART:20261108T000000Z");
    // El carrete termina a las 05:00 del domingo: 08:00 UTC.
    expect(ics).toContain("DTEND:20261108T080000Z");
  });

  it("separa las líneas con CRLF y no pasa de 75 bytes por línea", () => {
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("escapa las comas y los saltos de la descripción", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(
      "temática trae cualquier cosa que te sirva para tomar\\, excepto un vaso o tazón",
    );
    expect(unfolded).toContain(
      "\\n\\nhttps://www.roahoki.com/cumple/Ab3dEf6hIj9L/carrete",
    );
  });

  it("nunca lleva la dirección de la casa", () => {
    expect(ics).toContain("LOCATION:en mi casa");
  });

  it("usa un UID estable por invitado y plan", () => {
    expect(ics).toContain("UID:party-g1@roahoki.com");
  });
});
