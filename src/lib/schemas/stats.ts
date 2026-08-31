import { z } from "zod";
import { EXERCISE_SLUGS } from "@/lib/stats/exercises";

/**
 * Validación de lo que manda el panel al registrar repeticiones.
 *
 * Mismo patrón que `logbook.ts` y `testimonial.ts`: una sola definición, que el
 * route handler consume con `safeParse`.
 *
 * Lo que viaja siempre es **la dirección**. La cantidad es opcional: sin ella
 * —el caso del tap— el paso lo pone el servidor, y ningún cuerpo de request
 * puede cambiar cuánto vale un toque. Con ella —el caso de la serie escrita a
 * mano— el cliente sí elige el número, porque es justo el dato que aporta, pero
 * acotado acá y no en el input del formulario: el `max` del `<input>` es una
 * ayuda visual, no una barrera.
 */

/**
 * Cuánto mueve el contador un tap.
 *
 * Hoy es 1 para los seis ejercicios, handstand incluido: un set de 60 segundos
 * son 60 taps, o una serie escrita de 60. Es una decisión de producto, no una
 * limitación; el día que convenga que cada ejercicio tenga su propio paso, esto
 * pasa a ser un campo del catálogo de `exercises.ts` y el resto del código no
 * se entera.
 */
export const COUNTER_STEP = 1;

/**
 * El techo de una serie escrita a mano.
 *
 * No es una regla de entrenamiento sino un freno al dedo: con el teclado
 * numérico del celular, un cero de más convierte 60 en 600 y el total de la
 * semana queda arruinado hasta que me acuerde de restarlo. 500 deja pasar
 * cualquier serie real —la más larga acá es un handstand medido en segundos— y
 * frena el error de tipeo.
 */
export const MAX_MANUAL_AMOUNT = 500;

export const counterEventSchema = z.object({
  exercise: z.enum(EXERCISE_SLUGS, {
    errorMap: () => ({ message: "Ese ejercicio no existe." }),
  }),
  direction: z.enum(["up", "down"], {
    errorMap: () => ({ message: "La dirección tiene que ser 'up' o 'down'." }),
  }),
  amount: z
    .number({ invalid_type_error: "La cantidad tiene que ser un número." })
    .int("La cantidad tiene que ser un número entero.")
    .min(1, "La cantidad tiene que ser al menos 1.")
    .max(
      MAX_MANUAL_AMOUNT,
      `La cantidad no puede pasar de ${MAX_MANUAL_AMOUNT}.`,
    )
    .optional(),
});

export type CounterEventInput = z.infer<typeof counterEventSchema>;

/**
 * El delta que le corresponde a un evento: la cantidad con el signo de la
 * dirección. Sin cantidad, vale el paso de un tap.
 */
export function deltaFor(
  direction: CounterEventInput["direction"],
  amount: number = COUNTER_STEP,
): number {
  return direction === "up" ? amount : -amount;
}

export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}
