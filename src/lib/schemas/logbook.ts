import { z } from "zod";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage";

/**
 * Validación de las notas del logbook, compartida entre el editor y los route
 * handlers.
 *
 * Mismo patrón que `testimonial.ts`: el esquema define la regla una sola vez y
 * normaliza de paso, así el handler no hace conversiones a mano.
 */

export const TITLE_MAX_LENGTH = 200;
export const SLUG_MAX_LENGTH = 80;
export const SUMMARY_MAX_LENGTH = 300;
// Las columnas son `text` sin límite. El tope lo pone la aplicación: aunque el
// panel esté autenticado, un cuerpo sin techo es una forma fácil de llenar la
// base sin querer al pegar algo enorme desde el celular.
const BODY_MAX_LENGTH = 100_000;
const TAG_MAX_LENGTH = 40;
const MAX_TAGS = 12;

/** Peso máximo por imagen. El límite de request de Vercel está en 4.5 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .max(SLUG_MAX_LENGTH, "El slug es demasiado largo.")
  .regex(
    /^[a-z\d]+(?:-[a-z\d]+)*$/,
    "El slug solo admite minúsculas, números y guiones simples.",
  );

/**
 * Normaliza un tag: minúsculas y sin espacios sobrantes.
 *
 * Sin esto, "Rails" y "rails" serían dos tags distintos, y como no hay tabla de
 * tags que los unifique, el listado por tag mostraría resultados partidos.
 */
const tagField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Un tag no puede estar vacío.")
  .max(TAG_MAX_LENGTH, "Ese tag es demasiado largo.");

const tagsField = z
  .array(tagField)
  .max(MAX_TAGS, `No más de ${MAX_TAGS} tags.`)
  .default([])
  // Duplicados fuera, conservando el orden en que se escribieron.
  .transform((tags) => [...new Set(tags)]);

function emptyToNull(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

const optionalText = (max: number, message: string) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform(emptyToNull)
    .pipe(z.string().max(max, message).nullable());

const optionalUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform(emptyToNull)
  .pipe(
    z
      .string()
      .max(1000, "La URL es demasiado larga.")
      .url("La portada no es una URL válida.")
      .nullable(),
  );

export const createEntrySchema = z.object({
  title: z
    .string({ required_error: "El título es obligatorio." })
    .trim()
    .min(1, "El título es obligatorio.")
    .max(TITLE_MAX_LENGTH, "El título es demasiado largo."),

  // Opcional al crear: si no viene, se deriva del título con `availableSlugFor`.
  slug: slugField.optional(),

  summary: optionalText(SUMMARY_MAX_LENGTH, "El resumen es demasiado largo."),

  bodyMd: z
    .string({ required_error: "El cuerpo es obligatorio." })
    .min(1, "El cuerpo es obligatorio.")
    .max(BODY_MAX_LENGTH, "El cuerpo es demasiado largo."),

  coverImageUrl: optionalUrl,
  tags: tagsField,
  status: z.enum(["draft", "published"]).default("published"),

  // Se acepta para poder fechar una nota en el día que ocurrió lo que cuenta.
  // Si no viene, la base pone `now()`.
  publishedAt: z
    .string()
    .datetime({ offset: true, message: "La fecha no es válida." })
    .optional(),
});

/**
 * Los mismos campos, todos opcionales, para un PATCH.
 *
 * `.partial()` sobre el esquema de creación y no un esquema aparte: así una
 * regla nueva no se puede agregar en un lado y olvidar en el otro.
 *
 * El `refine` rechaza un cuerpo vacío. Sin él, un PATCH sin campos devolvería
 * 200 sin haber hecho nada, que es peor que un error: parece que funcionó.
 */
export const updateEntrySchema = createEntrySchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "No hay nada que actualizar.",
  });

export type CreateEntryData = z.output<typeof createEntrySchema>;
export type UpdateEntryData = z.output<typeof updateEntrySchema>;

/** El primer mensaje de error, para la respuesta de la API. */
export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

/**
 * Validación de la imagen que sube el editor.
 *
 * Se valida la extensión contra la allowlist de `src/lib/storage` y no el
 * `type` que declara el navegador: el `type` lo controla quien sube y se puede
 * falsear. La extensión es además lo que determina con qué `Content-Type` se
 * va a servir el archivo después.
 */
export const uploadImageSchema = z.object({
  extension: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) => ALLOWED_IMAGE_EXTENSIONS.includes(value),
      `Formato no admitido. Se aceptan: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}.`,
    ),
  size: z
    .number()
    .int()
    .positive("El archivo está vacío.")
    .max(MAX_IMAGE_BYTES, "La imagen no puede pesar más de 4 MB."),
});
