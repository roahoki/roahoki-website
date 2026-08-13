import { describe, expect, it } from "vitest";
import { formatEntryDate } from "./format";

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
