import { describe, expect, it } from "vitest";
import { eventBySlug } from "./events";
import {
  guestEventUrl,
  guestUrl,
  inviteMessage,
  reminderMessage,
  whatsappLink,
  whatsappNumber,
} from "./links";

const TOKEN = "Ab3dEf6hIj9L";

describe("links del cumpleaños", () => {
  it("arma el link personal y el de un plan con el dominio del sitio", () => {
    expect(guestUrl(TOKEN)).toBe("https://www.roahoki.com/cumple/Ab3dEf6hIj9L");
    expect(guestEventUrl(TOKEN, eventBySlug("run"))).toBe(
      "https://www.roahoki.com/cumple/Ab3dEf6hIj9L/trote",
    );
  });

  it("agrega el 56 a un celular chileno escrito sin código de país", () => {
    expect(whatsappNumber("9 8765 4321")).toBe("56987654321");
    expect(whatsappNumber("+56 9 8765 4321")).toBe("56987654321");
    expect(whatsappNumber("+54 11 2345 6789")).toBe("541123456789");
  });

  it("no inventa un número cuando el teléfono no sirve", () => {
    expect(whatsappNumber(null)).toBeNull();
    expect(whatsappNumber("1234")).toBeNull();
  });

  it("abre el chat con el mensaje escrito", () => {
    const link = whatsappLink("987654321", "hola :)\nchao");
    expect(link).toBe("https://wa.me/56987654321?text=hola%20%3A)%0Achao");
  });

  it("sin teléfono deja elegir el contacto en WhatsApp", () => {
    expect(whatsappLink(null, "hola")).toBe("https://wa.me/?text=hola");
  });

  it("escribe la invitación y el recordatorio con el link", () => {
    expect(inviteMessage("cata", TOKEN)).toBe(
      "Cata!! te mandé tu invitación personal, revísala acá :)\nhttps://www.roahoki.com/cumple/Ab3dEf6hIj9L",
    );
    expect(reminderMessage("vale", TOKEN, eventBySlug("hike"))).toContain(
      "te falta confirmar el manquehue",
    );
  });
});
