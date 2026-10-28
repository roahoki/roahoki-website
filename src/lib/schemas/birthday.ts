import { z } from "zod";
import { EVENT_SLUGS } from "@/lib/birthday/events";
import {
  MAX_POINTS_PER_STROKE,
  MAX_STROKES,
  ROKI_COLORS,
} from "@/lib/birthday/roki";
import { TOKEN_PATTERN } from "@/lib/birthday/token";

/**
 * Validación de todo lo que entra al cumpleaños: lo que manda el invitado desde
 * su página y lo que manda Joaquín desde el panel.
 *
 * Mismo patrón que `stats.ts`: una sola definición, que el formulario y el
 * route handler comparten. Los mensajes van en español porque el panel los
 * muestra tal cual.
 */

const eventSlug = z.enum(EVENT_SLUGS, {
  errorMap: () => ({ message: "Ese plan no existe." }),
});

const token = z
  .string({ invalid_type_error: "Falta el link." })
  .regex(TOKEN_PATTERN, "Ese link no existe.");

// ---------------------------------------------------------------------------
// Lo que manda el invitado

export const rsvpInputSchema = z.object({
  token,
  event: eventSlug,
  status: z.enum(["going", "not_going"], {
    errorMap: () => ({ message: "La respuesta tiene que ser voy o no voy." }),
  }),
});

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export const scratchInputSchema = z.object({ token });

/** Una coordenada del lienzo, normalizada de 0 a 1. */
const coordinate = z.number().finite().min(0).max(1);

export const rokiSchema = z
  .object({
    strokes: z
      .array(
        z.object({
          color: z.enum(ROKI_COLORS),
          points: z
            .array(z.tuple([coordinate, coordinate]))
            .min(2, "Cada trazo necesita al menos dos puntos.")
            .max(MAX_POINTS_PER_STROKE),
        }),
      )
      .min(1, "Dibuja algo antes de guardar.")
      .max(MAX_STROKES, "Son demasiados trazos."),
    eye: z.number().int().min(0).nullable(),
  })
  // El ojo es el índice de un trazo: tiene que existir.
  .refine((roki) => roki.eye === null || roki.eye < roki.strokes.length, {
    message: "El ojo no corresponde a ningún trazo.",
    path: ["eye"],
  });

export const rokiInputSchema = z.object({ token, roki: rokiSchema });

// ---------------------------------------------------------------------------
// Lo que manda Joaquín desde el panel

/**
 * Un teléfono para `wa.me`: dígitos, con `+`, espacios o guiones opcionales.
 * Se guarda como se escribió y se limpia al armar el link.
 */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s-]{8,20}$/, "Ese teléfono no se ve bien.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const guestInputSchema = z.object({
  name: z
    .string({ required_error: "Falta el nombre." })
    .trim()
    .min(1, "Falta el nombre.")
    .max(60, "El nombre es muy largo."),
  phone,
  personalMessage: z
    .string()
    .trim()
    .max(600, "El mensaje no puede pasar de 600 caracteres.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  invitedEvents: z
    .array(eventSlug)
    .min(1, "Elige al menos un plan.")
    // Sin duplicados, para que la casilla marcada dos veces no cuente doble.
    .transform((events) => [...new Set(events)]),
});

export type GuestInput = z.infer<typeof guestInputSchema>;

/** El soporte: Joaquín corrige la respuesta de alguien. `null` la borra. */
export const adminRsvpSchema = z.object({
  event: eventSlug,
  status: z.enum(["going", "not_going"]).nullable(),
});

export const albumInputSchema = z.object({
  event: eventSlug,
  url: z
    .string()
    .trim()
    .url("Pega el link completo del álbum.")
    .startsWith("https://", "El link tiene que empezar con https://.")
    .nullable()
    .or(z.literal("").transform(() => null)),
});

/**
 * Los textos de un plan desde el panel. `texts: null` vuelve a los de
 * `events.ts`. Los largos máximos son holgados: solo cuidan que un pegado por
 * error no rompa la página.
 */
export const eventDetailSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Cada dato necesita un subtítulo.")
    .max(60, "El subtítulo es muy largo (máximo 60)."),
  value: z
    .string()
    .trim()
    .min(1, "Cada dato necesita su texto.")
    .max(500, "El texto es muy largo (máximo 500)."),
});

export const eventTextsSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Falta la pregunta.")
    .max(120, "La pregunta es muy larga (máximo 120)."),
  details: z.array(eventDetailSchema).max(8, "Máximo 8 datos por plan."),
});

export const eventTextsInputSchema = z.object({
  event: eventSlug,
  texts: eventTextsSchema.nullable(),
});

export type EventTexts = z.infer<typeof eventTextsSchema>;

export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}
