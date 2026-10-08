import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./db-errors";

const uniqueOn = (constraint: string) => ({
  code: "23505",
  constraint_name: constraint,
});

describe("isUniqueViolation", () => {
  it("reconoce el código 23505", () => {
    expect(isUniqueViolation(uniqueOn("logbook_entries_slug_key"))).toBe(true);
  });

  it("no confunde otros errores de Postgres", () => {
    expect(isUniqueViolation({ code: "23514" })).toBe(false);
  });

  it.each([null, undefined, "error", new Error("x")])(
    "devuelve false para %o",
    (value) => {
      expect(isUniqueViolation(value)).toBe(false);
    },
  );

  // `logbook_entries` tiene dos índices únicos, slug y número, y cada choque
  // necesita un mensaje distinto para quien escribe.
  it("con un índice, solo reconoce los choques de ese índice", () => {
    const slug = uniqueOn("logbook_entries_slug_key");

    expect(isUniqueViolation(slug, "logbook_entries_slug_key")).toBe(true);
    expect(isUniqueViolation(slug, "logbook_entries_number_key")).toBe(false);
  });
});
