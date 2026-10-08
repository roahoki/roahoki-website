import { describe, expect, it } from "vitest";
import { formatEntryDate, formatEntryDateShort, formatTimeAgo } from "./format";

describe("formatEntryDate", () => {
  it("formatea en español, con el mes en palabra", () => {
    expect(formatEntryDate("2026-08-13T12:00:00Z")).toBe(
      "13 de agosto de 2026",
    );
  });

  it("no rellena el día con cero", () => {
    expect(formatEntryDate("2026-01-05T12:00:00Z")).toBe("5 de enero de 2026");
  });

  /**
   * El caso que justifica fijar `timeZone: "UTC"`.
   *
   * Sin fijarla, el servidor formatea en la zona del servidor —UTC en Vercel— y
   * el cliente en la del visitante. Una nota publicada cerca de medianoche UTC
   * sale con un día en el HTML del servidor y otro tras la hidratación, y React
   * reporta un error de hidratación.
   */
  it("da el mismo día sin importar la zona horaria del proceso", () => {
    const original = process.env.TZ;
    const iso = "2026-08-13T23:30:00Z";

    process.env.TZ = "UTC";
    const enUtc = formatEntryDate(iso);

    process.env.TZ = "Pacific/Auckland"; // UTC+12: ahí ya es el día 14
    const enAuckland = formatEntryDate(iso);

    process.env.TZ = original;

    expect(enUtc).toBe(enAuckland);
    expect(enUtc).toBe("13 de agosto de 2026");
  });

  it("respeta la fecha que se guardó, no la de hoy", () => {
    expect(formatEntryDate("2020-12-31T00:00:00Z")).toBe(
      "31 de diciembre de 2020",
    );
  });
});

describe("formatEntryDateShort", () => {
  it.each([
    ["2026-09-24T12:00:00.000Z", "24 sept 2026"],
    ["2026-08-25T12:00:00.000Z", "25 ago 2026"],
    ["2026-10-03T12:00:00.000Z", "3 oct 2026"],
  ])("formatea %s como %s", (iso, expected) => {
    expect(formatEntryDateShort(iso)).toBe(expected);
  });

  // Igual que la fecha larga: en UTC, para que servidor y cliente coincidan.
  it("no corre el día cerca de medianoche", () => {
    expect(formatEntryDateShort("2026-10-03T23:30:00.000Z")).toBe("3 oct 2026");
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");
  const ago = (seconds: number) =>
    new Date(now.getTime() - seconds * 1000).toISOString();

  it.each([
    [20, "recién"],
    [5 * 60, "hace 5 min"],
    [2 * 3600, "hace 2 h"],
    [26 * 3600, "ayer"],
    [3 * 86400, "hace 3 d"],
    [15 * 86400, "hace 2 sem."],
  ])("a %i segundos dice %s", (seconds, expected) => {
    expect(formatTimeAgo(ago(seconds), now)).toBe(expected);
  });
});
