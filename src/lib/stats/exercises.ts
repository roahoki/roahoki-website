/**
 * El catálogo de ejercicios que se cuentan.
 *
 * Es la **única** definición. El panel arma su grilla desde acá y la página
 * pública arma la suya desde acá; con dos listas paralelas, agregar un
 * ejercicio obliga a acordarse de tocar las dos, y el síntoma de olvidarse es
 * silencioso: el panel suma algo que nadie ve.
 *
 * Los slugs viajan a la base y a la API, así que van en inglés como el resto
 * del código. Las etiquetas son contenido y van en español.
 *
 * El orden de `EXERCISES` es el orden en que se muestran. No es incidental: en
 * el panel define qué cuatro ejercicios entran en la primera pantalla del
 * celular y cuáles quedan bajo el scroll.
 */

export const EXERCISE_SLUGS = [
  "pull_ups",
  "push_ups",
  "squats",
  "dips",
  "handstand_seconds",
  "pistol_squats",
] as const;

export type ExerciseSlug = (typeof EXERCISE_SLUGS)[number];

/**
 * Qué mide el contador. Las repeticiones se muestran peladas; los segundos
 * llevan sufijo, porque "60" y "60 s" no significan lo mismo.
 */
export type ExerciseUnit = "reps" | "seconds";

export type Exercise = {
  slug: ExerciseSlug;
  label: string;
  unit: ExerciseUnit;
};

export const EXERCISES: readonly Exercise[] = [
  { slug: "pull_ups", label: "Dominadas", unit: "reps" },
  { slug: "push_ups", label: "Flexiones", unit: "reps" },
  { slug: "squats", label: "Sentadillas", unit: "reps" },
  { slug: "dips", label: "Fondos", unit: "reps" },
  { slug: "handstand_seconds", label: "Handstand", unit: "seconds" },
  { slug: "pistol_squats", label: "Sentadillas pistol", unit: "reps" },
];

const BY_SLUG = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));

/**
 * Guarda de tipos para lo que llega de afuera.
 *
 * La usa el esquema de zod de la API: sin esto, un slug inventado llegaría
 * hasta el `insert` y lo rechazaría recién el check de la base, con un error de
 * Postgres en vez de un 400 explicando qué valor no existe.
 */
export function isExerciseSlug(value: unknown): value is ExerciseSlug {
  return typeof value === "string" && BY_SLUG.has(value as ExerciseSlug);
}

export function exerciseBySlug(slug: ExerciseSlug): Exercise {
  const exercise = BY_SLUG.get(slug);
  // No debería poder pasar: el parámetro ya está tipado como `ExerciseSlug`.
  // Está por si el catálogo se edita dejando `EXERCISE_SLUGS` y `EXERCISES`
  // desalineados, que es el único modo de que el mapa no tenga la clave.
  if (!exercise) {
    throw new Error(`El ejercicio "${slug}" no está en EXERCISES.`);
  }
  return exercise;
}
