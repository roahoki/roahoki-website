import { describe, expect, it } from "vitest";
import robots from "./robots";

const rules = () => {
  const result = robots().rules;
  return Array.isArray(result) ? result : [result];
};

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

describe("robots", () => {
  it("bloquea el panel y los endpoints para todos los bots", () => {
    for (const rule of rules()) {
      expect(asArray(rule.disallow)).toContain("/admin");
      expect(asArray(rule.disallow)).toContain("/api/");
    }
  });

  /**
   * El test que importa. En `robots.txt` gana el grupo más específico: un bot
   * nombrado ignora por completo el grupo `*`. Si alguien agrega una ruta
   * prohibida solo a `*`, los crawlers de IA seguirían entrando sin que nada
   * falle visiblemente.
   */
  it("repite los disallow en el grupo de crawlers de IA, que no hereda de `*`", () => {
    const [wildcard, aiCrawlers] = rules();

    expect(asArray(wildcard.userAgent)).toEqual(["*"]);
    expect(asArray(aiCrawlers.disallow).sort()).toEqual(
      asArray(wildcard.disallow).sort(),
    );
  });

  it("permite explícitamente a los crawlers de IA de cada proveedor", () => {
    const agents = rules().flatMap((rule) => asArray(rule.userAgent));

    for (const bot of [
      "GPTBot",
      "OAI-SearchBot",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      "CCBot",
    ]) {
      expect(agents).toContain(bot);
    }
  });

  it("apunta al sitemap con una URL absoluta, que es lo único que acepta el formato", () => {
    expect(robots().sitemap).toBe("https://www.roahoki.com/sitemap.xml");
  });

  it("declara el host canónico con www", () => {
    expect(robots().host).toBe("https://www.roahoki.com");
  });
});
