import { z } from "zod";

/**
 * Esquemas de validación de testimonials, compartidos entre el formulario y los
 * route handlers.
 *
 * La regla del proyecto es que la validación se defina una sola vez. Antes
 * estaba escrita dos veces —`if` encadenados en el cliente y otros iguales en
 * el servidor— y ya habían empezado a divergir: el cliente exigía un contacto
 * mirando los campos con `.trim()`, el servidor los miraba sin trimear, así que
 * un LinkedIn con solo espacios pasaba el chequeo del servidor.
 *
 * El cuerpo viaja en snake_case porque ese es el contrato que ya habla el
 * formulario. El esquema valida en snake_case y **entrega camelCase**, que es
 * lo que espera la capa de queries: la traducción ocurre una vez, acá.
 */

/** Mínimos de largo. Se exportan para que el formulario muestre el contador. */
export const NAME_MIN_LENGTH = 2;
export const MESSAGE_MIN_LENGTH = 20;

/** Ruta sintética del error de "al menos un contacto", que no es de un campo. */
export const CONTACT_ISSUE_PATH = "contact";

// Las columnas son `text` sin límite en Postgres, así que el tope lo pone la
// aplicación. Sin esto, `POST /api/testimonials` es un endpoint público que
// acepta un mensaje de cualquier tamaño y lo guarda.
const NAME_MAX_LENGTH = 120;
const MESSAGE_MAX_LENGTH = 2000;
const URL_MAX_LENGTH = 1000;
const EMAIL_MAX_LENGTH = 254; // el máximo que permite el RFC 5321
const GITHUB_USERNAME_MAX_LENGTH = 39; // el máximo real de GitHub

/**
 * Normaliza un campo opcional: recorta, y convierte `""`, espacios, `null` y
 * `undefined` en `null`.
 *
 * Un `""` y un `null` significan lo mismo —"no lo llenó"— y guardarlos
 * distinto obliga a chequear los dos casos en cada lectura posterior.
 */
function emptyToNull(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

const optionalInput = z.union([z.string(), z.null()]).optional();

/**
 * Antepone `https://` cuando falta el esquema.
 *
 * Quien pega su perfil desde el celular suele mandar `linkedin.com/in/...` sin
 * protocolo. Guardarlo así produce un enlace roto —el navegador lo interpreta
 * como ruta relativa del sitio—, y rechazarlo sin más sería hostil por un
 * detalle que se puede arreglar solo.
 */
function withScheme(value: string | null): string | null {
  if (value === null) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** Acepta el usuario pelado, con `@` adelante, o la URL completa del perfil. */
function bareGithubUsername(value: string | null): string | null {
  if (value === null) return null;
  return value
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

const optionalUrl = optionalInput
  .transform(emptyToNull)
  .transform(withScheme)
  .pipe(
    z
      .string()
      .max(URL_MAX_LENGTH, "El enlace es demasiado largo.")
      .url("El enlace no es una URL válida.")
      .nullable(),
  );

export const createTestimonialSchema = z
  .object({
    name: z
      .string({ required_error: "El nombre debe tener al menos 2 caracteres." })
      .trim()
      .min(NAME_MIN_LENGTH, "El nombre debe tener al menos 2 caracteres.")
      .max(NAME_MAX_LENGTH, "El nombre es demasiado largo."),

    message: z
      .string({
        required_error: "El mensaje debe tener al menos 20 caracteres.",
      })
      .trim()
      .min(MESSAGE_MIN_LENGTH, "El mensaje debe tener al menos 20 caracteres.")
      .max(MESSAGE_MAX_LENGTH, "El mensaje es demasiado largo."),

    image_url: optionalUrl,
    linkedin_url: optionalUrl,

    github_username: optionalInput
      .transform(emptyToNull)
      .transform(bareGithubUsername)
      .pipe(
        z
          .string()
          .max(GITHUB_USERNAME_MAX_LENGTH, "El usuario de GitHub es muy largo.")
          .regex(
            /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
            "Ese no parece un usuario de GitHub válido.",
          )
          .nullable(),
      ),

    email: optionalInput
      .transform(emptyToNull)
      .pipe(
        z
          .string()
          .max(EMAIL_MAX_LENGTH, "El correo es demasiado largo.")
          .email("Ese no parece un correo válido.")
          .nullable(),
      ),
  })
  // Va después del `object` y no dentro de un campo porque la regla mira tres
  // campos a la vez: ninguno es inválido por sí solo.
  .refine(
    (data) =>
      data.linkedin_url !== null ||
      data.github_username !== null ||
      data.email !== null,
    {
      message: "Debes ingresar al menos un medio de contacto.",
      path: [CONTACT_ISSUE_PATH],
    },
  )
  // `status` no sale de acá a propósito: lo fija `createTestimonial` en
  // `pending`. Si viajara en el cuerpo, el formulario público podría mandar
  // `approved` y saltarse la moderación.
  .transform((data) => ({
    name: data.name,
    message: data.message,
    imageUrl: data.image_url,
    linkedinUrl: data.linkedin_url,
    githubUsername: data.github_username,
    email: data.email,
  }));

export type CreateTestimonialInput = z.input<typeof createTestimonialSchema>;
export type CreateTestimonialData = z.output<typeof createTestimonialSchema>;

/** Las claves de `testimonialForm` que corresponden a un error de validación. */
export type TestimonialMessageKey =
  | "validation_name"
  | "validation_message"
  | "validation_social";

/**
 * Traduce el primer problema a una clave de `messages/*.json`.
 *
 * El formulario vive dentro de `[locale]` y muestra los errores con next-intl,
 * así que no puede usar el texto del esquema —está solo en español—. El esquema
 * define la *regla* y el cliente elige *cómo la dice*: el mensaje en español
 * sirve para lo que responde la API, donde no hay locale.
 *
 * Devuelve `null` cuando el problema no tiene una clave propia (largos máximos,
 * formato de URL): son casos que el formulario previene con `maxLength` y que,
 * si igual llegaran, caen en el mensaje de error genérico.
 */
export function messageKeyForIssue(
  issue: z.ZodIssue,
): TestimonialMessageKey | null {
  switch (issue.path[0]) {
    case "name":
      return issue.code === z.ZodIssueCode.too_small ? "validation_name" : null;
    case "message":
      return issue.code === z.ZodIssueCode.too_small
        ? "validation_message"
        : null;
    case CONTACT_ISSUE_PATH:
      return "validation_social";
    default:
      return null;
  }
}

/** El primer mensaje de error en español, para las respuestas de la API. */
export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

/**
 * Cuerpo de las acciones de moderación.
 *
 * El id se valida como uuid y no como string cualquiera: sin eso, un id con
 * formato inválido llega hasta Postgres y vuelve como error 500 de driver en
 * vez de un 400 honesto.
 */
export const moderateTestimonialSchema = z.object({
  id: z.string().uuid("Id inválido."),
  status: z.enum(["pending", "approved", "rejected"], {
    errorMap: () => ({ message: "Estado inválido." }),
  }),
});

export const deleteTestimonialSchema = z.object({
  id: z.string().uuid("Id inválido."),
});
