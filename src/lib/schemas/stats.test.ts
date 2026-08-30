import { describe, expect, it } from "vitest";
import { EXERCISE_SLUGS } from "@/lib/stats/exercises";
import {
  COUNTER_STEP,
  counterEventSchema,
  deltaFor,
  firstErrorMessage,
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
   * El contrato manda dirección, no cantidad. Es lo que mantiene el paso
   * definido en un solo lugar: un cuerpo con `delta` no puede elegir cuánto
   * sumar, porque el campo directamente no se lee.
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

  it("nunca devuelve cero", () => {
    // Un delta de 0 lo rechaza el check de la base. Que no pueda salir de acá
    // es lo que hace que ese rechazo sea inalcanzable en vez de un 500 posible.
    expect(deltaFor("up")).not.toBe(0);
    expect(deltaFor("down")).not.toBe(0);
  });
});
