import { describe, expect, it } from "vitest";
import { absoluteUrl, SITE_URL, siteUrl } from "./site";

describe("SITE_URL", () => {
  it("es absoluta y sobre https", () => {
    expect(siteUrl.protocol).toBe("https:");
  });

  // El apex responde 308 hacia www. Si alguien lo cambia, las previews de
  // Instagram y WhatsApp quedan a merced de que el scraper siga el redirect.
  it("apunta al host canónico con www, no al apex", () => {
    expect(siteUrl.hostname).toBe("www.roahoki.com");
  });

  it("no termina en barra, para no duplicarla al concatenar rutas", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });
});

describe("absoluteUrl", () => {
  it("resuelve una ruta absoluta contra el origen del sitio", () => {
    expect(absoluteUrl("/logbook/una-nota")).toBe(
      "https://www.roahoki.com/logbook/una-nota",
    );
  });

  it("no duplica la barra cuando la ruta ya la trae", () => {
    expect(absoluteUrl("/")).toBe("https://www.roahoki.com/");
  });

  // Sin barra inicial `new URL` resuelve relativo al directorio actual, que en
  // la raíz da lo mismo. Se fija el comportamiento para que un cambio se note.
  it("acepta rutas sin barra inicial", () => {
    expect(absoluteUrl("feed.xml")).toBe("https://www.roahoki.com/feed.xml");
  });
});
