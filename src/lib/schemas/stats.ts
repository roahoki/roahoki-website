import { z } from "zod";
import { EXERCISE_SLUGS } from "@/lib/stats/exercises";

/**
 * Validación de lo que manda el panel al tocar un botón del contador.
 *
 * Mismo patrón que `logbook.ts` y `testimonial.ts`: una sola definición, que el
 * route handler consume con `safeParse`.
 *
 * Lo que viaja es **la dirección, no la cantidad**. El cliente dice "arriba" o
 * "abajo" y el servidor decide cuánto vale eso. Es una diferencia que importa
 * por dos motivos: el paso queda definido en un solo lugar —cuando los segundos
 * de handstand pasen a sumar de a 10, no hay que tocar ni el componente ni el
 * contrato—, y ningún cuerpo de request puede elegir cuánto sumar.
 */

/**
 * Cuánto mueve el contador un tap.
 *
 * Hoy es 1 para los seis ejercicios, handstand incluido: un set de 60 segundos
 * son 60 taps. Es una decisión de producto, no una limitación; el día que
 * convenga que cada ejercicio tenga su propio paso, esto pasa a ser un campo
 * del catálogo de `exercises.ts` y el resto del código no se entera.
 */
export const COUNTER_STEP = 1;

export const counterEventSchema = z.object({
  exercise: z.enum(EXERCISE_SLUGS, {
    errorMap: () => ({ message: "Ese ejercicio no existe." }),
  }),
  direction: z.enum(["up", "down"], {
    errorMap: () => ({ message: "La dirección tiene que ser 'up' o 'down'." }),
  }),
});

export type CounterEventInput = z.infer<typeof counterEventSchema>;

/** El delta que le corresponde a una dirección. */
export function deltaFor(direction: CounterEventInput["direction"]): number {
  return direction === "up" ? COUNTER_STEP : -COUNTER_STEP;
}

export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}
