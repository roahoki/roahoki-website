import { describe, expect, it } from "vitest";
import { weekRangeAt } from "./week";

/**
 * La ventana semanal es lo único que separa "esta semana" de "la semana
 * pasada", y no hay ningún reinicio que la respalde: si este cálculo se
 * equivoca por un día, el contador público muestra el número de otra semana sin
 * ninguna señal de que algo salió mal.
 *
 * Por eso los casos son los bordes, no el caso feliz.
 */
describe("weekRangeAt", () => {
  /** Atajo para leer las aserciones sin `new Date(...).toISOString()` encima. */
  function rangeOf(instant: string) {
    const { start, end } = weekRangeAt(new Date(instant));
    return { start: start.toISOString(), end: end.toISOString() };
  }

  it("desde un día cualquiera devuelve su lunes y el lunes siguiente", () => {
    // Sábado 29 de agosto de 2026.
    expect(rangeOf("2026-08-29T14:30:00.000Z")).toEqual({
      start: "2026-08-24T00:00:00.000Z",
      end: "2026-08-31T00:00:00.000Z",
    });
  });

  it("en el lunes a las 00:00 en punto, la semana recién empieza", () => {
    // El instante exacto del cambio pertenece a la semana que arranca, no a la
    // que termina: es el borde que decide si un tap del lunes temprano cuenta
    // en el contador nuevo o resucita el viejo.
    expect(rangeOf("2026-08-31T00:00:00.000Z")).toEqual({
      start: "2026-08-31T00:00:00.000Z",
      end: "2026-09-07T00:00:00.000Z",
    });
  });

  it("el último milisegundo del domingo todavía es la semana que termina", () => {
    expect(rangeOf("2026-08-30T23:59:59.999Z")).toEqual({
      start: "2026-08-24T00:00:00.000Z",
      end: "2026-08-31T00:00:00.000Z",
    });
  });

  it("el domingo cuenta como el último día, no como el primero", () => {
    // `getUTCDay()` devuelve 0 para el domingo. Tratado como el día 0 de la
    // semana, el domingo abriría una semana propia de un solo día y partiría el
    // contador en dos justo antes del cierre.
    const domingo = rangeOf("2026-08-30T10:00:00.000Z");
    const sabado = rangeOf("2026-08-29T10:00:00.000Z");

    expect(domingo).toEqual(sabado);
  });

  it("cruza el cambio de mes", () => {
    // Miércoles 1 de julio: su lunes está en junio.
    expect(rangeOf("2026-07-01T08:00:00.000Z")).toEqual({
      start: "2026-06-29T00:00:00.000Z",
      end: "2026-07-06T00:00:00.000Z",
    });
  });

  it("cruza el cambio de año", () => {
    // Jueves 1 de enero de 2026: su lunes está en diciembre de 2025.
    expect(rangeOf("2026-01-01T08:00:00.000Z")).toEqual({
      start: "2025-12-29T00:00:00.000Z",
      end: "2026-01-05T00:00:00.000Z",
    });
  });

  it("siempre dura exactamente siete días", () => {
    const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

    // Un año entero, día por día: cubre los dos cambios de horario de verano
    // del hemisferio sur y los dos del norte. En UTC ninguno existe, y esa es
    // justamente la propiedad que se está afirmando.
    for (let dia = 0; dia < 365; dia++) {
      const instante = new Date(
        Date.UTC(2026, 0, 1) + dia * 24 * 60 * 60 * 1000,
      );
      const { start, end } = weekRangeAt(instante);

      expect(end.getTime() - start.getTime()).toBe(SIETE_DIAS);
      expect(start.getUTCDay()).toBe(1); // lunes
      expect(start.getTime()).toBeLessThanOrEqual(instante.getTime());
      expect(end.getTime()).toBeGreaterThan(instante.getTime());
    }
  });

  /**
   * El caso que justifica calcular todo en UTC.
   *
   * La página pública se renderiza en el servidor y se ve en el browser del
   * visitante. Si la semana dependiera de la zona horaria de quien ejecuta el
   * cálculo, el mismo instante caería en semanas distintas según dónde esté
   * parado, y cerca del lunes el HTML del servidor no coincidiría con el del
   * cliente.
   */
  it("no depende de la zona horaria del proceso", () => {
    const instante = new Date("2026-08-30T23:59:59.999Z");
    const original = process.env.TZ;

    try {
      process.env.TZ = "UTC";
      const enUtc = weekRangeAt(instante);

      // UTC+13: ahí ya es lunes 31 y la semana local sería la siguiente.
      process.env.TZ = "Pacific/Auckland";
      const enAuckland = weekRangeAt(instante);

      // UTC-10: ahí todavía es sábado 29.
      process.env.TZ = "Pacific/Honolulu";
      const enHonolulu = weekRangeAt(instante);

      expect(enAuckland).toEqual(enUtc);
      expect(enHonolulu).toEqual(enUtc);
    } finally {
      process.env.TZ = original;
    }
  });

  it("no modifica la fecha que recibe", () => {
    // Recibe casi siempre un `new Date()` que el llamador sigue usando. Mutarlo
    // con `setUTCDate` para retroceder al lunes le movería el reloj por debajo.
    const instante = new Date("2026-08-29T14:30:00.000Z");

    weekRangeAt(instante);

    expect(instante.toISOString()).toBe("2026-08-29T14:30:00.000Z");
  });
});
