import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  CONTACT_ISSUE_PATH,
  createTestimonialSchema,
  deleteTestimonialSchema,
  firstErrorMessage,
  messageKeyForIssue,
  moderateTestimonialSchema,
} from "./testimonial";

/** Un cuerpo válido mínimo, para partir de algo que pasa y romperlo de a uno. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Joaquín Peralta",
    message: "Las clases fueron muy claras y aprendí bastante.",
    email: "joaquin@example.com",
    ...overrides,
  };
}

describe("createTestimonialSchema — casos válidos", () => {
  it("acepta un cuerpo mínimo y entrega camelCase", () => {
    const result = createTestimonialSchema.parse(validBody());

    expect(result).toEqual({
      name: "Joaquín Peralta",
      message: "Las clases fueron muy claras y aprendí bastante.",
      imageUrl: null,
      linkedinUrl: null,
      githubUsername: null,
      email: "joaquin@example.com",
    });
  });

  it("no deja pasar `status`, aunque venga en el cuerpo", () => {
    const result = createTestimonialSchema.parse(
      validBody({ status: "approved" }),
    );

    expect(result).not.toHaveProperty("status");
  });

  it("basta con LinkedIn como único contacto", () => {
    const result = createTestimonialSchema.parse(
      validBody({ email: null, linkedin_url: "https://linkedin.com/in/joa" }),
    );

    expect(result.linkedinUrl).toBe("https://linkedin.com/in/joa");
  });

  it("basta con GitHub como único contacto", () => {
    const result = createTestimonialSchema.parse(
      validBody({ email: null, github_username: "roahoki" }),
    );

    expect(result.githubUsername).toBe("roahoki");
  });

  it("recorta los espacios de nombre y mensaje", () => {
    const result = createTestimonialSchema.parse(
      validBody({ name: "  Joaquín  ", message: `  ${"a".repeat(25)}  ` }),
    );

    expect(result.name).toBe("Joaquín");
    expect(result.message).toBe("a".repeat(25));
  });
});

describe("createTestimonialSchema — normalización de opcionales", () => {
  it.each([
    ["cadena vacía", ""],
    ["solo espacios", "   "],
    ["null", null],
    ["ausente", undefined],
  ])("convierte %s en null", (_label, value) => {
    const result = createTestimonialSchema.parse(
      validBody({ linkedin_url: value }),
    );

    expect(result.linkedinUrl).toBeNull();
  });

  it("antepone https:// a un enlace sin esquema", () => {
    const result = createTestimonialSchema.parse(
      validBody({ email: null, linkedin_url: "linkedin.com/in/joa" }),
    );

    expect(result.linkedinUrl).toBe("https://linkedin.com/in/joa");
  });

  it("respeta el esquema cuando ya viene", () => {
    const result = createTestimonialSchema.parse(
      validBody({ email: null, linkedin_url: "http://linkedin.com/in/joa" }),
    );

    expect(result.linkedinUrl).toBe("http://linkedin.com/in/joa");
  });

  it.each([
    ["usuario pelado", "roahoki"],
    ["con arroba", "@roahoki"],
    ["URL completa", "https://github.com/roahoki"],
    ["URL con www y barra final", "https://www.github.com/roahoki/"],
  ])("extrae el usuario de GitHub desde %s", (_label, value) => {
    const result = createTestimonialSchema.parse(
      validBody({ email: null, github_username: value }),
    );

    expect(result.githubUsername).toBe("roahoki");
  });
});

describe("createTestimonialSchema — casos inválidos", () => {
  it("rechaza un nombre de menos de 2 caracteres", () => {
    const result = createTestimonialSchema.safeParse(validBody({ name: "J" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["name"]);
    }
  });

  it("rechaza un nombre que es solo espacios", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ name: "     " }),
    );

    expect(result.success).toBe(false);
  });

  it("rechaza un mensaje de menos de 20 caracteres", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ message: "Muy corto." }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["message"]);
    }
  });

  it("rechaza cuando no hay ningún medio de contacto", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ email: null }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([CONTACT_ISSUE_PATH]);
    }
  });

  // El bug que existía: el cliente trimeaba antes de decidir si había contacto
  // y el servidor no, así que un campo de puros espacios pasaba el chequeo del
  // servidor y se guardaba un testimonio sin forma de contactar a nadie.
  it("rechaza contactos que son solo espacios en blanco", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ email: "  ", linkedin_url: "   ", github_username: " " }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([CONTACT_ISSUE_PATH]);
    }
  });

  it("rechaza un correo con formato inválido", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ email: "no-es-un-correo" }),
    );

    expect(result.success).toBe(false);
  });

  it("rechaza un usuario de GitHub con caracteres ilegales", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ email: null, github_username: "no válido!" }),
    );

    expect(result.success).toBe(false);
  });

  it("rechaza un nombre por encima del máximo", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ name: "a".repeat(121) }),
    );

    expect(result.success).toBe(false);
  });

  it("rechaza un mensaje por encima del máximo", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ message: "a".repeat(2001) }),
    );

    expect(result.success).toBe(false);
  });

  it("rechaza un cuerpo que no es un objeto", () => {
    expect(createTestimonialSchema.safeParse(null).success).toBe(false);
    expect(createTestimonialSchema.safeParse("texto").success).toBe(false);
  });
});

describe("createTestimonialSchema — bordes", () => {
  it("acepta un nombre de exactamente 2 caracteres", () => {
    expect(
      createTestimonialSchema.safeParse(validBody({ name: "Jo" })).success,
    ).toBe(true);
  });

  it("acepta un mensaje de exactamente 20 caracteres", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ message: "a".repeat(20) }),
    );

    expect(result.success).toBe(true);
  });

  it("acepta un nombre de exactamente el máximo", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ name: "a".repeat(120) }),
    );

    expect(result.success).toBe(true);
  });

  it("acepta un usuario de GitHub de 39 caracteres", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ email: null, github_username: "a".repeat(39) }),
    );

    expect(result.success).toBe(true);
  });

  it("rechaza un usuario de GitHub de 40 caracteres", () => {
    const result = createTestimonialSchema.safeParse(
      validBody({ email: null, github_username: "a".repeat(40) }),
    );

    expect(result.success).toBe(false);
  });
});

describe("messageKeyForIssue", () => {
  function issuesFor(body: Record<string, unknown>): z.ZodIssue[] {
    const result = createTestimonialSchema.safeParse(body);
    if (result.success) throw new Error("Se esperaba que fallara.");
    return result.error.issues;
  }

  it("mapea el nombre corto a validation_name", () => {
    const [issue] = issuesFor(validBody({ name: "J" }));
    expect(messageKeyForIssue(issue)).toBe("validation_name");
  });

  it("mapea el mensaje corto a validation_message", () => {
    const [issue] = issuesFor(validBody({ message: "corto" }));
    expect(messageKeyForIssue(issue)).toBe("validation_message");
  });

  it("mapea la falta de contacto a validation_social", () => {
    const [issue] = issuesFor(validBody({ email: null }));
    expect(messageKeyForIssue(issue)).toBe("validation_social");
  });

  // Estos no tienen traducción propia: el formulario los previene con
  // `maxLength` y, si igual llegaran, muestra el error genérico.
  it("devuelve null para un problema sin clave propia", () => {
    const [issue] = issuesFor(validBody({ name: "a".repeat(121) }));
    expect(messageKeyForIssue(issue)).toBeNull();
  });
});

describe("firstErrorMessage", () => {
  it("devuelve el mensaje en español del primer problema", () => {
    const result = createTestimonialSchema.safeParse(validBody({ name: "J" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstErrorMessage(result.error)).toBe(
        "El nombre debe tener al menos 2 caracteres.",
      );
    }
  });
});

describe("moderateTestimonialSchema", () => {
  const id = "3f4a9d2e-1b6c-4c0a-9f5e-7d8a2b1c3e4f";

  it.each(["pending", "approved", "rejected"] as const)(
    "acepta el estado %s",
    (status) => {
      expect(moderateTestimonialSchema.safeParse({ id, status }).success).toBe(
        true,
      );
    },
  );

  it("rechaza un estado desconocido", () => {
    const result = moderateTestimonialSchema.safeParse({ id, status: "nope" });
    expect(result.success).toBe(false);
  });

  // Sin esto el id malformado llegaba a Postgres y volvía como 500 de driver.
  it("rechaza un id que no es uuid", () => {
    const result = moderateTestimonialSchema.safeParse({
      id: "123",
      status: "approved",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un cuerpo sin id", () => {
    expect(
      moderateTestimonialSchema.safeParse({ status: "approved" }).success,
    ).toBe(false);
  });
});

describe("deleteTestimonialSchema", () => {
  it("acepta un uuid válido", () => {
    const result = deleteTestimonialSchema.safeParse({
      id: "3f4a9d2e-1b6c-4c0a-9f5e-7d8a2b1c3e4f",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un id vacío", () => {
    expect(deleteTestimonialSchema.safeParse({ id: "" }).success).toBe(false);
  });
});
