import { describe, expect, it } from "vitest";
import {
  createEntrySchema,
  firstErrorMessage,
  MAX_IMAGE_BYTES,
  updateEntrySchema,
  uploadImageSchema,
} from "./logbook";

function validEntry(overrides: Record<string, unknown> = {}) {
  return {
    title: "Mi primera nota",
    bodyMd: "# Hola\n\nUn cuerpo.",
    ...overrides,
  };
}

describe("createEntrySchema — casos válidos", () => {
  it("acepta lo mínimo y aplica los defaults", () => {
    const result = createEntrySchema.parse(validEntry());

    expect(result).toMatchObject({
      title: "Mi primera nota",
      bodyMd: "# Hola\n\nUn cuerpo.",
      summary: null,
      coverImageUrl: null,
      tags: [],
      status: "published",
    });
    expect(result.slug).toBeUndefined();
  });

  it("acepta un slug explícito", () => {
    const result = createEntrySchema.parse(
      validEntry({ slug: "un-slug-propio" }),
    );

    expect(result.slug).toBe("un-slug-propio");
  });

  it("acepta una fecha de publicación con offset", () => {
    const result = createEntrySchema.parse(
      validEntry({ publishedAt: "2026-01-15T10:00:00Z" }),
    );

    expect(result.publishedAt).toBe("2026-01-15T10:00:00Z");
  });

  it("recorta el título", () => {
    expect(
      createEntrySchema.parse(validEntry({ title: "  Hola  " })).title,
    ).toBe("Hola");
  });
});

describe("createEntrySchema — tags", () => {
  it("normaliza a minúsculas", () => {
    const result = createEntrySchema.parse(
      validEntry({ tags: ["Rails", "POSTGRES"] }),
    );

    expect(result.tags).toEqual(["rails", "postgres"]);
  });

  // Sin normalizar, "Rails" y "rails" serían dos tags distintos y el listado
  // por tag mostraría resultados partidos: no hay tabla que los unifique.
  it("elimina duplicados después de normalizar", () => {
    const result = createEntrySchema.parse(
      validEntry({ tags: ["Rails", "rails", " rails "] }),
    );

    expect(result.tags).toEqual(["rails"]);
  });

  it("conserva el orden en que se escribieron", () => {
    const result = createEntrySchema.parse(
      validEntry({ tags: ["zeta", "alfa", "media"] }),
    );

    expect(result.tags).toEqual(["zeta", "alfa", "media"]);
  });

  it("rechaza un tag vacío", () => {
    expect(
      createEntrySchema.safeParse(validEntry({ tags: ["   "] })).success,
    ).toBe(false);
  });

  it("rechaza más de 12 tags", () => {
    const tags = Array.from({ length: 13 }, (_, i) => `tag-${i}`);

    expect(createEntrySchema.safeParse(validEntry({ tags })).success).toBe(
      false,
    );
  });
});

describe("createEntrySchema — casos inválidos", () => {
  it.each([
    ["sin título", { title: undefined }],
    ["título vacío", { title: "   " }],
    ["sin cuerpo", { bodyMd: undefined }],
    ["cuerpo vacío", { bodyMd: "" }],
  ])("rechaza una nota %s", (_label, overrides) => {
    expect(createEntrySchema.safeParse(validEntry(overrides)).success).toBe(
      false,
    );
  });

  it.each([
    ["con espacios", "un slug"],
    ["con acentos", "programación"],
    ["con guiones dobles", "un--slug"],
    ["que empieza con guión", "-slug"],
    ["que termina con guión", "slug-"],
    ["con barra", "un/slug"],
    ["con punto", "un.slug"],
    ["vacío", ""],
    ["más largo que el máximo", "a".repeat(81)],
  ])("rechaza un slug %s", (_label, slug) => {
    expect(createEntrySchema.safeParse(validEntry({ slug })).success).toBe(
      false,
    );
  });

  // Las mayúsculas se normalizan en vez de rechazarse: es lo único que se puede
  // arreglar solo sin adivinar la intención, igual que con los tags.
  it("normaliza un slug con mayúsculas en vez de rechazarlo", () => {
    const result = createEntrySchema.parse(validEntry({ slug: "Un-Slug" }));

    expect(result.slug).toBe("un-slug");
  });

  it("rechaza un status desconocido", () => {
    expect(
      createEntrySchema.safeParse(validEntry({ status: "archivada" })).success,
    ).toBe(false);
  });

  it("rechaza una portada que no es URL", () => {
    expect(
      createEntrySchema.safeParse(validEntry({ coverImageUrl: "no-es-url" }))
        .success,
    ).toBe(false);
  });

  it("rechaza una fecha inválida", () => {
    expect(
      createEntrySchema.safeParse(validEntry({ publishedAt: "ayer" })).success,
    ).toBe(false);
  });

  it("rechaza un título por encima del máximo", () => {
    expect(
      createEntrySchema.safeParse(validEntry({ title: "a".repeat(201) }))
        .success,
    ).toBe(false);
  });
});

describe("updateEntrySchema", () => {
  it("acepta un cambio de un solo campo", () => {
    const result = updateEntrySchema.safeParse({ title: "Otro título" });

    expect(result.success).toBe(true);
  });

  it("acepta pasar una nota a borrador", () => {
    const result = updateEntrySchema.safeParse({ status: "draft" });

    expect(result.success).toBe(true);
  });

  // Un PATCH vacío devolvería 200 sin haber hecho nada, que parece que funcionó.
  it("rechaza un cuerpo sin ningún campo", () => {
    const result = updateEntrySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("hereda las reglas del esquema de creación", () => {
    expect(updateEntrySchema.safeParse({ slug: "un slug" }).success).toBe(
      false,
    );
    expect(updateEntrySchema.safeParse({ title: "   " }).success).toBe(false);
    expect(updateEntrySchema.safeParse({ status: "archivada" }).success).toBe(
      false,
    );
  });
});

describe("uploadImageSchema", () => {
  it.each(["jpg", "jpeg", "png", "webp", "gif", "avif"])(
    "acepta la extensión %s",
    (extension) => {
      expect(
        uploadImageSchema.safeParse({ extension, size: 1000 }).success,
      ).toBe(true);
    },
  );

  it("normaliza la extensión a minúsculas", () => {
    const result = uploadImageSchema.parse({ extension: "PNG", size: 1000 });

    expect(result.extension).toBe("png");
  });

  it.each(["svg", "exe", "pdf", "html", ""])(
    "rechaza la extensión %o",
    (extension) => {
      expect(
        uploadImageSchema.safeParse({ extension, size: 1000 }).success,
      ).toBe(false);
    },
  );

  it("rechaza un archivo vacío", () => {
    expect(
      uploadImageSchema.safeParse({ extension: "png", size: 0 }).success,
    ).toBe(false);
  });

  it("acepta un archivo justo en el límite", () => {
    expect(
      uploadImageSchema.safeParse({ extension: "png", size: MAX_IMAGE_BYTES })
        .success,
    ).toBe(true);
  });

  it("rechaza un archivo por encima del límite", () => {
    expect(
      uploadImageSchema.safeParse({
        extension: "png",
        size: MAX_IMAGE_BYTES + 1,
      }).success,
    ).toBe(false);
  });
});

describe("firstErrorMessage", () => {
  it("devuelve el mensaje del primer problema", () => {
    const result = createEntrySchema.safeParse(validEntry({ title: "" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstErrorMessage(result.error)).toBe("El título es obligatorio.");
    }
  });
});
