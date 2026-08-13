import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Mi primera nota", "mi-primera-nota"],
    ["Programación en Rails", "programacion-en-rails"],
    ["El año que aprendí Postgres", "el-ano-que-aprendi-postgres"],
    ["ÁÉÍÓÚ Ü", "aeiou-u"],
    ["  espacios   de   sobra  ", "espacios-de-sobra"],
    ["Signos: ¿qué? ¡pasa!", "signos-que-pasa"],
    ["guiones---repetidos", "guiones-repetidos"],
    ["MAYÚSCULAS", "mayusculas"],
    ["con 123 números", "con-123-numeros"],
    ["emoji 🚀 al medio", "emoji-al-medio"],
  ])("convierte %o en %o", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("no deja guiones al principio ni al final", () => {
    expect(slugify("---hola---")).toBe("hola");
    expect(slugify("¡¡¡hola!!!")).toBe("hola");
  });

  // Que devuelva "" y no algo inventado es deliberado: quien llama decide.
  it.each([
    ["cadena vacía", ""],
    ["solo espacios", "   "],
    ["solo signos", "!!!???"],
    ["solo emojis", "🚀🎉"],
  ])("devuelve cadena vacía para %s", (_label, input) => {
    expect(slugify(input)).toBe("");
  });

  it("recorta a 80 caracteres", () => {
    const result = slugify("palabra ".repeat(40));

    expect(result.length).toBeLessThanOrEqual(80);
  });

  it("no deja un guión colgando cuando el corte cae justo en uno", () => {
    // 80 caracteres exactos terminarían en guión sin la limpieza final.
    const result = slugify(`${"a".repeat(80)} b`);

    expect(result.endsWith("-")).toBe(false);
  });

  it("lo que produce siempre es un slug válido", () => {
    const inputs = [
      "Mi primera nota",
      "Programación en Rails",
      "emoji 🚀 al medio",
      "palabra ".repeat(40),
    ];

    for (const input of inputs) {
      expect(isValidSlug(slugify(input))).toBe(true);
    }
  });
});

describe("uniqueSlug", () => {
  it("devuelve la base cuando está libre", () => {
    expect(uniqueSlug("una-nota", [])).toBe("una-nota");
    expect(uniqueSlug("una-nota", ["otra-nota"])).toBe("una-nota");
  });

  // Arranca en 2 porque el que ya existe es, implícitamente, el 1.
  it("agrega -2 cuando la base está tomada", () => {
    expect(uniqueSlug("una-nota", ["una-nota"])).toBe("una-nota-2");
  });

  it("sigue subiendo mientras haya colisiones", () => {
    expect(
      uniqueSlug("una-nota", ["una-nota", "una-nota-2", "una-nota-3"]),
    ).toBe("una-nota-4");
  });

  it("no se confunde con un slug que apenas comparte prefijo", () => {
    expect(uniqueSlug("nota", ["nota-larga", "notas"])).toBe("nota");
  });

  it("acepta un Set además de un arreglo", () => {
    expect(uniqueSlug("una-nota", new Set(["una-nota"]))).toBe("una-nota-2");
  });
});

describe("isValidSlug", () => {
  it.each(["hola", "hola-mundo", "nota-2", "123", "a"])(
    "acepta %o",
    (value) => {
      expect(isValidSlug(value)).toBe(true);
    },
  );

  it.each([
    ["vacío", ""],
    ["con mayúsculas", "Hola"],
    ["con espacios", "hola mundo"],
    ["con acentos", "programación"],
    ["empieza con guión", "-hola"],
    ["termina con guión", "hola-"],
    ["guiones dobles", "hola--mundo"],
    ["con barra", "hola/mundo"],
    ["con punto", "hola.mundo"],
    ["más de 80", "a".repeat(81)],
  ])("rechaza %s", (_label, value) => {
    expect(isValidSlug(value)).toBe(false);
  });
});
