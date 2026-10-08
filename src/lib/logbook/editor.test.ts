import { describe, expect, it } from "vitest";
import { formatTagsInput, parseTagsInput } from "./editor";

describe("parseTagsInput", () => {
  it("separa por coma y recorta", () => {
    expect(parseTagsInput("rails, postgres ,  drizzle")).toEqual([
      "rails",
      "postgres",
      "drizzle",
    ]);
  });

  // Se normaliza igual que en el esquema de zod: si el editor mostrara "Rails"
  // y la base guardara "rails", cada recarga cambiaría el campo.
  it("normaliza a minúsculas", () => {
    expect(parseTagsInput("Rails, POSTGRES")).toEqual(["rails", "postgres"]);
  });

  it("elimina duplicados", () => {
    expect(parseTagsInput("rails, Rails, RAILS")).toEqual(["rails"]);
  });

  it("descarta las entradas vacías", () => {
    expect(parseTagsInput("rails, , ,postgres,")).toEqual([
      "rails",
      "postgres",
    ]);
  });

  it.each(["", "   ", ",,,"])("devuelve vacío para %o", (input) => {
    expect(parseTagsInput(input)).toEqual([]);
  });
});

describe("formatTagsInput", () => {
  it("une con coma y espacio", () => {
    expect(formatTagsInput(["rails", "postgres"])).toBe("rails, postgres");
  });

  it("devuelve cadena vacía sin tags", () => {
    expect(formatTagsInput([])).toBe("");
  });

  it("es el inverso de parseTagsInput", () => {
    const tags = ["rails", "postgres", "drizzle"];

    expect(parseTagsInput(formatTagsInput(tags))).toEqual(tags);
  });
});
