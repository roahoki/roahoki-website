import { describe, expect, it } from "vitest";
import {
  EXERCISE_SLUGS,
  EXERCISES,
  exerciseBySlug,
  isExerciseSlug,
} from "./exercises";

/**
 * El catálogo es una lista de slugs y una lista de objetos que tienen que
 * describir lo mismo. TypeScript garantiza que cada `slug` de `EXERCISES` es
 * uno de `EXERCISE_SLUGS`, pero no que estén todos ni que no se repitan: se
 * puede borrar una línea de `EXERCISES` y el proyecto compila igual.
 *
 * El síntoma de esa desalineación es mudo —un ejercicio que se puede guardar
 * pero que ninguna pantalla dibuja—, así que se afirma acá.
 */
describe("catálogo de ejercicios", () => {
  it("describe exactamente los slugs declarados, en el mismo orden", () => {
    expect(EXERCISES.map((exercise) => exercise.slug)).toEqual([
      ...EXERCISE_SLUGS,
    ]);
  });

  it("no repite slugs", () => {
    expect(new Set(EXERCISE_SLUGS).size).toBe(EXERCISE_SLUGS.length);
  });

  it("le da a cada ejercicio una etiqueta en español", () => {
    for (const exercise of EXERCISES) {
      expect(exercise.label.trim()).not.toBe("");
      // Las etiquetas son contenido visible, no identificadores: si alguna
      // quedó con el slug adentro, es que se copió sin traducir.
      expect(exercise.label).not.toBe(exercise.slug);
    }
  });

  it("cuenta el handstand en segundos y el resto en repeticiones", () => {
    // La unidad decide si la vista escribe "60" o "60 s". Es el único
    // ejercicio que no se mide en repeticiones.
    expect(exerciseBySlug("handstand_seconds").unit).toBe("seconds");

    const enSegundos = EXERCISES.filter(
      (exercise) => exercise.unit === "seconds",
    );
    expect(enSegundos).toHaveLength(1);
  });

  describe("isExerciseSlug", () => {
    it("acepta los slugs del catálogo", () => {
      for (const slug of EXERCISE_SLUGS) {
        expect(isExerciseSlug(slug)).toBe(true);
      }
    });

    it("rechaza cualquier otra cosa", () => {
      // Lo que llega por la API es `unknown`: no solo strings equivocados.
      for (const valor of [
        "burpees",
        "",
        "PULL_UPS",
        " pull_ups",
        null,
        undefined,
        42,
        { slug: "pull_ups" },
        ["pull_ups"],
      ]) {
        expect(isExerciseSlug(valor)).toBe(false);
      }
    });

    it("rechaza las propiedades heredadas de Object", () => {
      // Con un objeto plano como índice, `"toString" in catalogo` da true y el
      // slug inventado pasaría la validación. Por eso el catálogo es un `Map`.
      expect(isExerciseSlug("toString")).toBe(false);
      expect(isExerciseSlug("constructor")).toBe(false);
      expect(isExerciseSlug("__proto__")).toBe(false);
    });
  });
});
