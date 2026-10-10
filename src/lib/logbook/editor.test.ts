import { describe, expect, it } from "vitest";
import {
  isSameDay,
  parseTagsInput,
  parseTimestamp,
  toDateInput,
  withDate,
} from "./editor";

describe("parseTagsInput", () => {
  it("separa por coma y recorta", () => {
    expect(parseTagsInput("rails, postgres ,  drizzle")).toEqual([
      "rails",
      "postgres",
      "drizzle",
    ]);
  });

  // Se normaliza igual que en el esquema de zod: si el editor mostrara "Rails"
  // y la base guardara "rails", cada recarga cambiaría el campo.
  it("normaliza a minúsculas", () => {
    expect(parseTagsInput("Rails, POSTGRES")).toEqual(["rails", "postgres"]);
  });

  it("elimina duplicados", () => {
    expect(parseTagsInput("rails, Rails, RAILS")).toEqual(["rails"]);
  });

  it("descarta las entradas vacías", () => {
    expect(parseTagsInput("rails, , ,postgres,")).toEqual([
      "rails",
      "postgres",
    ]);
  });

  it.each(["", "   ", ",,,"])("devuelve vacío para %o", (input) => {
    expect(parseTagsInput(input)).toEqual([]);
  });
});

describe("fechas del panel", () => {
  // Así llega de Postgres. Safari no lo parsea tal cual.
  const fromDb = "2026-10-03 21:30:00.123+00";

  it("parseTimestamp entiende el formato de Postgres y el ISO", () => {
    expect(parseTimestamp(fromDb).toISOString()).toBe(
      "2026-10-03T21:30:00.123Z",
    );
    expect(parseTimestamp("2026-10-03T21:30:00.000Z").toISOString()).toBe(
      "2026-10-03T21:30:00.000Z",
    );
  });

  it("toDateInput da el día en UTC", () => {
    expect(toDateInput(fromDb)).toBe("2026-10-03");
  });

  it("withDate cambia el día y conserva la hora", () => {
    expect(withDate(fromDb, "2026-09-24")).toBe("2026-09-24T21:30:00.123Z");
  });

  it("isSameDay compara en UTC", () => {
    const a = new Date("2026-10-07T01:00:00Z");
    expect(isSameDay(a, new Date("2026-10-07T23:59:00Z"))).toBe(true);
    expect(isSameDay(a, new Date("2026-10-06T23:59:00Z"))).toBe(false);
  });
});
