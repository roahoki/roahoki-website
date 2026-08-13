import { describe, expect, it } from "vitest";
import {
  formatTagsInput,
  imageMarkdown,
  insertAsBlock,
  insertAtCursor,
  parseTagsInput,
} from "./editor";

describe("insertAtCursor", () => {
  it("inserta en la posición del cursor", () => {
    const result = insertAtCursor("hola mundo", "querido ", {
      start: 5,
      end: 5,
    });

    expect(result.value).toBe("hola querido mundo");
  });

  // Sin esto el cursor salta al final del textarea cuando React reescribe el
  // `value`, que es la molestia concreta al insertar una imagen a mitad de nota.
  it("deja el cursor justo después de lo insertado", () => {
    const result = insertAtCursor("hola mundo", "XY", { start: 5, end: 5 });

    expect(result.selection).toEqual({ start: 7, end: 7 });
  });

  it("reemplaza lo que esté seleccionado", () => {
    const result = insertAtCursor("hola mundo", "chau", { start: 0, end: 4 });

    expect(result.value).toBe("chau mundo");
    expect(result.selection).toEqual({ start: 4, end: 4 });
  });

  it("inserta al principio", () => {
    expect(insertAtCursor("mundo", "hola ", { start: 0, end: 0 }).value).toBe(
      "hola mundo",
    );
  });

  it("inserta al final", () => {
    expect(insertAtCursor("hola", " mundo", { start: 4, end: 4 }).value).toBe(
      "hola mundo",
    );
  });

  it("funciona sobre un texto vacío", () => {
    const result = insertAtCursor("", "algo", { start: 0, end: 0 });

    expect(result.value).toBe("algo");
    expect(result.selection).toEqual({ start: 4, end: 4 });
  });

  // El textarea puede reportar una selección desfasada si el valor cambió
  // entremedio; recortar evita generar texto con `undefined` adentro.
  it("acota una selección fuera de rango", () => {
    const result = insertAtCursor("hola", "X", { start: 99, end: 200 });

    expect(result.value).toBe("holaX");
  });

  it("acota una selección negativa", () => {
    expect(insertAtCursor("hola", "X", { start: -5, end: -1 }).value).toBe(
      "Xhola",
    );
  });
});

describe("insertAsBlock", () => {
  it("no agrega saltos en un texto vacío", () => {
    expect(insertAsBlock("", "![](u)", { start: 0, end: 0 }).value).toBe(
      "![](u)",
    );
  });

  // Pegada al párrafo, markdown trata la imagen como parte de ese párrafo.
  it("separa del párrafo anterior con una línea en blanco", () => {
    const result = insertAsBlock("Un párrafo.", "![](u)", {
      start: 11,
      end: 11,
    });

    expect(result.value).toBe("Un párrafo.\n\n![](u)");
  });

  it("completa el salto que falta cuando ya hay uno", () => {
    const result = insertAsBlock("Un párrafo.\n", "![](u)", {
      start: 12,
      end: 12,
    });

    expect(result.value).toBe("Un párrafo.\n\n![](u)");
  });

  it("no agrega nada si ya hay línea en blanco", () => {
    const result = insertAsBlock("Un párrafo.\n\n", "![](u)", {
      start: 13,
      end: 13,
    });

    expect(result.value).toBe("Un párrafo.\n\n![](u)");
  });

  it("separa también del texto que sigue", () => {
    const result = insertAsBlock("Antes.Después.", "![](u)", {
      start: 6,
      end: 6,
    });

    expect(result.value).toBe("Antes.\n\n![](u)\n\nDespués.");
  });

  it("deja el cursor después de la inserción", () => {
    const result = insertAsBlock("Antes.", "![](u)", { start: 6, end: 6 });

    expect(result.value.slice(0, result.selection.start)).toBe(
      "Antes.\n\n![](u)",
    );
  });
});

describe("imageMarkdown", () => {
  it("arma el markdown con alt vacío", () => {
    expect(imageMarkdown("https://x.test/a.png")).toBe(
      "![](https://x.test/a.png)",
    );
  });

  it("incluye el alt cuando se da", () => {
    expect(imageMarkdown("https://x.test/a.png", "una foto")).toBe(
      "![una foto](https://x.test/a.png)",
    );
  });
});

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
