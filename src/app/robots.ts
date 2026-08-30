import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * `robots.txt`, generado en build.
 *
 * Dice dos cosas: qué no se rastrea, y que los crawlers de IA son bienvenidos.
 * Lo segundo no cambia el comportamiento por defecto —`*` ya los deja pasar—
 * pero deja la intención escrita: varios de estos bots existen justamente para
 * poder excluirlos (`Google-Extended` y `Applebot-Extended` no hacen otra cosa
 * que decidir si el contenido alimenta modelos), así que nombrarlos y
 * permitirlos es la única forma de dar un sí explícito en vez de un sí por
 * omisión.
 */

/**
 * Lo que nadie rastrea.
 *
 * `/admin` es el panel y `/api/` son endpoints que devuelven JSON; ninguno
 * aporta a un índice y el primero además no debería aparecer en resultados.
 * Ojo que esto no es una medida de seguridad: `robots.txt` es una convención
 * que se respeta voluntariamente, y quien protege `/admin` es el layout del
 * route group `(protected)`.
 *
 * Es una constante y no una lista repetida en cada grupo a propósito. En
 * `robots.txt` gana el grupo **más específico** que matchee al bot: si mañana
 * alguien agrega una ruta prohibida solo al grupo `*`, los bots nombrados abajo
 * seguirían entrando, porque leen su propio grupo y ese no la tendría. Con una
 * sola constante compartida ese desfase no puede ocurrir.
 */
const DISALLOW = ["/admin", "/api/"];

/**
 * Los crawlers de IA que se permiten de forma explícita.
 *
 * Cada empresa suele correr varios agentes con propósitos distintos, y se
 * listan todos porque un permiso parcial produce resultados raros: dejar entrar
 * al de indexado pero no al que busca en vivo hace que el asistente sepa que el
 * sitio existe y no pueda citarlo.
 */
const AI_CRAWLERS = [
  // OpenAI: indexado, búsqueda de ChatGPT, y fetch disparado por un usuario.
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic.
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  // Perplexity.
  "PerplexityBot",
  "Perplexity-User",
  // Solo controlan el uso del contenido para entrenar; no rastrean por su
  // cuenta. Nombrarlos es la única forma de no quedar en el default.
  "Google-Extended",
  "Applebot-Extended",
  // Common Crawl. Alimenta buena parte de los datasets públicos.
  "CCBot",
  // Meta.
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    // Con `www`, igual que el resto: el apex responde 308 hacia acá.
    host: SITE_URL,
  };
}
