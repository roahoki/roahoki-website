import { describe, expect, it } from "vitest";
import { EXERCISE_SLUGS } from "@/lib/stats/exercises";
import {
  COUNTER_STEP,
  counterEventSchema,
  deltaFor,
  firstErrorMessage,
  MAX_MANUAL_AMOUNT,
} from "./stats";

/**
 * Este esquema es la única barrera entre el cuerpo de un request y un `insert`.
 * Lo que se prueba es qué deja pasar, sobre todo en los casos que no son un
 * string cualquiera.
 */
describe("counterEventSchema", () => {
  it("acepta cualquier ejercicio del catálogo en las dos direcciones", () => {
    for (const exercise of EXERCISE_SLUGS) {
      for (const direction of ["up", "down"] as const) {
        expect(
          counterEventSchema.safeParse({ exercise, direction }).success,
        ).toBe(true);
      }
    }
  });

  it("rechaza un ejercicio que no existe, con un mensaje que lo dice", () => {
    const result = counterEventSchema.safeParse({
      exercise: "burpees",
      direction: "up",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstErrorMessage(result.error)).toBe("Ese ejercicio no existe.");
    }
  });

  it("rechaza una dirección inventada", () => {
    expect(
      counterEventSchema.safeParse({ exercise: "pull_ups", direction: "sube" })
        .success,
    ).toBe(false);
  });

  /**
   * El tap manda dirección y nada más. Es lo que mantiene el paso definido en
   * un solo lugar: un cuerpo con `delta` no puede elegir cuánto sumar, porque
   * el campo directamente no se lee. La serie escrita usa `amount`, que sí se
   * lee pero pasa por los límites de abajo.
   */
  it("ignora un delta mandado a mano", () => {
    const result = counterEventSchema.safeParse({
      exercise: "pull_ups",
      direction: "up",
      delta: 9999,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ exercise: "pull_ups", direction: "up" });
    }
  });

  describe("la cantidad de una serie escrita", () => {
    it("acepta un entero dentro del rango", () => {
      const result = counterEventSchema.safeParse({
        exercise: "pull_ups",
        direction: "up",
        amount: 12,
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.amount).toBe(12);
    });

    it("acepta los dos extremos del rango", () => {
      for (const amount of [1, MAX_MANUAL_AMOUNT]) {
        expect(
          counterEventSchema.safeParse({
            exercise: "pull_ups",
            direction: "up",
            amount,
          }).success,
        ).toBe(true);
      }
    });

    /**
     * El techo es el freno al dedo: con el teclado numérico del celular, un
     * cero de más convierte 60 en 600. El `max` del `<input>` no alcanza —se
     * saltea mandando el request a mano—, así que el que cuenta es este.
     */
    it("rechaza pasarse del techo, con un mensaje que dice cuál es", () => {
      const result = counterEventSchema.safeParse({
        exercise: "pull_ups",
        direction: "up",
        amount: MAX_MANUAL_AMOUNT + 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(firstErrorMessage(result.error)).toContain(
          String(MAX_MANUAL_AMOUNT),
        );
      }
    });

    it("rechaza el cero, los negativos y los decimales", () => {
      // Un cero o un decimal saldrían de acá como un delta que el check de la
      // base rechaza; un negativo restaría desde un campo que dice "Sumar".
      for (const amount of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(
          counterEventSchema.safeParse({
            exercise: "pull_ups",
            direction: "up",
            amount,
          }).success,
        ).toBe(false);
      }
    });

    it("rechaza una cantidad que viene como string", () => {
      // El input del panel entrega texto: si el componente se olvidara de
      // convertirlo, esto lo frena acá y no con un insert raro.
      expect(
        counterEventSchema.safeParse({
          exercise: "pull_ups",
          direction: "up",
          amount: "12",
        }).success,
      ).toBe(false);
    });
  });

  it("rechaza los campos faltantes y los cuerpos que no son objetos", () => {
    for (const body of [
      {},
      { exercise: "pull_ups" },
      { direction: "up" },
      null,
      "pull_ups",
      42,
      [],
    ]) {
      expect(counterEventSchema.safeParse(body).success).toBe(false);
    }
  });
});

describe("deltaFor", () => {
  it("traduce la dirección al paso, con signo", () => {
    expect(deltaFor("up")).toBe(COUNTER_STEP);
    expect(deltaFor("down")).toBe(-COUNTER_STEP);
  });

  it("usa la cantidad cuando la hay, con el signo de la dirección", () => {
    expect(deltaFor("up", 12)).toBe(12);
    expect(deltaFor("down", 12)).toBe(-12);
  });

  it("vuelve al paso de un tap cuando la cantidad es undefined", () => {
    // `undefined` es lo que devuelve el esquema para un tap, no un caso raro:
    // el default del parámetro es lo que mantiene el paso en un solo lugar.
    expect(deltaFor("up", undefined)).toBe(COUNTER_STEP);
  });

  it("nunca devuelve cero", () => {
    // Un delta de 0 lo rechaza el check de la base. Que no pueda salir de acá
    // es lo que hace que ese rechazo sea inalcanzable en vez de un 500 posible.
    expect(deltaFor("up")).not.toBe(0);
    expect(deltaFor("down")).not.toBe(0);
  });
});
