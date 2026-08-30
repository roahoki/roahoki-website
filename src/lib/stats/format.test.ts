import { describe, expect, it } from "vitest";
import { formatWeekRange } from "./format";
import { weekRangeAt } from "./week";

describe("formatWeekRange", () => {
  /** Cómo se escribe la semana que contiene a `instant`. */
  function weekOf(instant: string) {
    return formatWeekRange(weekRangeAt(new Date(instant)));
  }

  it("nombra el domingo como último día, no el lunes siguiente", () => {
    // El rango termina el lunes 31 a las 00:00, pero el último día que cuenta
    // es el domingo 30. Escribir el 31 correría la semana un día respecto del
    // contador que está justo al lado.
    expect(weekOf("2026-08-26T12:00:00.000Z")).toBe("24 al 30 de agosto");
  });

  it("no repite el mes cuando la semana no lo cruza", () => {
    expect(weekOf("2026-08-26T12:00:00.000Z")).not.toContain("de agosto al");
  });

  it("nombra los dos meses cuando la semana los cruza", () => {
    // Semana del lunes 29 de junio al domingo 5 de julio.
    expect(weekOf("2026-07-01T12:00:00.000Z")).toBe(
      "29 de junio al 5 de julio",
    );
  });

  it("cruza el cambio de año", () => {
    // Lunes 29 de diciembre de 2025 al domingo 4 de enero de 2026.
    expect(weekOf("2026-01-01T12:00:00.000Z")).toBe(
      "29 de diciembre al 4 de enero",
    );
  });

  it("no depende de la zona horaria del proceso", () => {
    // Mismo motivo que en `week.test.ts`: el texto se arma en el servidor y se
    // vuelve a evaluar en el browser del visitante. Si cambiara con la zona,
    // React reportaría un error de hidratación.
    const range = weekRangeAt(new Date("2026-08-30T23:59:59.999Z"));
    const original = process.env.TZ;

    try {
      process.env.TZ = "UTC";
      const enUtc = formatWeekRange(range);

      process.env.TZ = "Pacific/Auckland";
      expect(formatWeekRange(range)).toBe(enUtc);

      process.env.TZ = "Pacific/Honolulu";
      expect(formatWeekRange(range)).toBe(enUtc);
    } finally {
      process.env.TZ = original;
    }
  });
});
