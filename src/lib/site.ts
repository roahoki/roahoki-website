/**
 * Origen público del sitio.
 *
 * Es el único lugar donde vive el dominio. Lo usa `metadataBase` para resolver
 * las URLs relativas de Open Graph, y lo van a usar el sitemap y el feed del
 * logbook para emitir enlaces absolutos.
 *
 * Va con `www`: el apex `roahoki.com` responde 308 hacia este host, y los
 * scrapers de Instagram y WhatsApp no siempre siguen el redirect cuando buscan
 * la imagen de preview. Publicar directamente el destino evita ese salto.
 *
 * Constante y no variable de entorno a propósito: el dominio es uno solo y no
 * cambia entre entornos. En desarrollo las previews igual apuntan a producción,
 * que es lo correcto — un `localhost` en un `og:image` no le sirve a nadie.
 */
export const SITE_URL = "https://www.roahoki.com";

/** `SITE_URL` como `URL`, que es lo que espera `metadataBase`. */
export const siteUrl = new URL(SITE_URL);

/** Convierte una ruta del sitio en URL absoluta, para OG, sitemap y feed. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
