import { describe, expect, it } from "vitest";
import { formatDay, formatDayTime, formatTime } from "./format";

describe("fechas del cumpleaños", () => {
  it("escribe el día como en el diseño, sin comas ni puntos", () => {
    expect(formatDay("2026-11-07T09:00:00-03:00")).toBe("sáb 7 nov");
    expect(formatDay("2026-11-04T19:00:00-03:00")).toBe("mié 4 nov");
  });

  it("agrega la hora en 24 horas", () => {
    expect(formatDayTime("2026-11-07T21:00:00-03:00")).toBe(
      "sáb 7 nov · 21:00",
    );
    expect(formatTime("2026-11-08T05:00:00-03:00")).toBe("05:00");
  });

  it("usa la hora de Santiago aunque el instante venga en UTC", () => {
    expect(formatDayTime("2026-11-08T00:30:00Z")).toBe("sáb 7 nov · 21:30");
  });
});
