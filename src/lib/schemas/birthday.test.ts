import { describe, expect, it } from "vitest";
import {
  albumInputSchema,
  guestInputSchema,
  rokiSchema,
  rsvpInputSchema,
} from "./birthday";

const TOKEN = "Ab3dEf6hIj9L";

describe("rsvpInputSchema", () => {
  it("acepta una respuesta válida", () => {
    const parsed = rsvpInputSchema.safeParse({
      token: TOKEN,
      event: "run",
      status: "going",
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza un plan inventado con un mensaje en español", () => {
    const parsed = rsvpInputSchema.safeParse({
      token: TOKEN,
      event: "trote",
      status: "going",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toBe("Ese plan no existe.");
  });

  it("rechaza un token con otra forma antes de ir a la base", () => {
    const parsed = rsvpInputSchema.safeParse({
      token: "../../admin",
      event: "run",
      status: "going",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("guestInputSchema", () => {
  it("limpia espacios, quita vacíos y duplicados", () => {
    const parsed = guestInputSchema.parse({
      name: "  cata ",
      phone: "",
      personalMessage: "   ",
      invitedEvents: ["run", "run", "hike"],
    });
    expect(parsed).toEqual({
      name: "cata",
      phone: undefined,
      personalMessage: undefined,
      invitedEvents: ["run", "hike"],
    });
  });

  it("exige al menos un plan", () => {
    const parsed = guestInputSchema.safeParse({
      name: "cata",
      invitedEvents: [],
    });
    expect(parsed.error?.issues[0].message).toBe("Elige al menos un plan.");
  });

  it("acepta un teléfono chileno con o sin formato", () => {
    for (const phone of ["+56 9 8765 4321", "987654321", "+56-9-8765-4321"]) {
      expect(
        guestInputSchema.safeParse({
          name: "cata",
          phone,
          invitedEvents: ["run"],
        }).success,
      ).toBe(true);
    }
    expect(
      guestInputSchema.safeParse({
        name: "cata",
        phone: "llámame",
        invitedEvents: ["run"],
      }).success,
    ).toBe(false);
  });
});

describe("rokiSchema", () => {
  const stroke = {
    color: "#C42B1C",
    points: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  };

  it("acepta un roki con ojo y uno sin ojo", () => {
    expect(rokiSchema.safeParse({ strokes: [stroke], eye: 0 }).success).toBe(
      true,
    );
    expect(rokiSchema.safeParse({ strokes: [stroke], eye: null }).success).toBe(
      true,
    );
  });

  it("rechaza un ojo que no es ninguno de los trazos", () => {
    expect(rokiSchema.safeParse({ strokes: [stroke], eye: 1 }).success).toBe(
      false,
    );
  });

  it("rechaza puntos fuera del lienzo y colores fuera de la paleta", () => {
    expect(
      rokiSchema.safeParse({
        strokes: [
          {
            ...stroke,
            points: [
              [0, 0],
              [1.5, 0],
            ],
          },
        ],
        eye: null,
      }).success,
    ).toBe(false);
    expect(
      rokiSchema.safeParse({
        strokes: [{ ...stroke, color: "#FF00FF" }],
        eye: null,
      }).success,
    ).toBe(false);
  });

  it("rechaza un roki vacío", () => {
    expect(rokiSchema.safeParse({ strokes: [], eye: null }).success).toBe(
      false,
    );
  });
});

describe("albumInputSchema", () => {
  it("acepta un link https y trata el vacío como quitar el álbum", () => {
    expect(
      albumInputSchema.parse({
        event: "party",
        url: "https://www.icloud.com/sharedalbum/#B0abc",
      }).url,
    ).toBe("https://www.icloud.com/sharedalbum/#B0abc");
    expect(albumInputSchema.parse({ event: "party", url: "" }).url).toBeNull();
  });

  it("rechaza un link que no es https", () => {
    expect(
      albumInputSchema.safeParse({ event: "party", url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      albumInputSchema.safeParse({ event: "party", url: "http://example.com" })
        .success,
    ).toBe(false);
  });
});
