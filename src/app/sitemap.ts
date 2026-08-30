import type { MetadataRoute } from "next";
import type { LogbookEntry } from "@/db/schema";
import { listPublishedEntries } from "@/lib/logbook/queries";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import { absoluteUrl } from "@/lib/site";

/**
 * El sitemap, en `/sitemap.xml`.
 *
 * Se revalida cada hora, igual que `/logbook`: una nota recién publicada
 * aparece acá sin esperar un deploy, que es justamente lo que permite que un
 * crawler la encuentre el mismo día.
 *
 * No lleva `changeFrequency` ni `priority`. Google los ignora hace años y lo
 * único que hacen es dar la impresión de que se los está usando para algo.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let entries: LogbookEntry[] = [];
  try {
    entries = await listPublishedEntries();
  } catch {
    // Mismo criterio que `/logbook` y `generateStaticParams`: si la base no
    // responde durante el build, el sitemap sale solo con las rutas estáticas
    // en vez de voltear el deploy. Se corrige solo en la próxima revalidación.
  }

  // La fecha de la nota más reciente. `listPublishedEntries` ordena por
  // `publishedAt` descendente, pero la que importa acá es `updatedAt`: editar
  // una nota vieja también cambia el listado, y ordenar por publicación no lo
  // reflejaría.
  const lastEntryUpdate = entries
    .map((entry) => new Date(entry.updatedAt))
    .reduce<Date | undefined>(
      (latest, date) => (latest === undefined || date > latest ? date : latest),
      undefined,
    );

  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    // Solo el listado del logbook sabe de verdad cuándo cambió. El resto de las
    // páginas es contenido escrito a mano: fechar todas con el día del build
    // sería declarar un cambio en cada deploy, y un `lastmod` que miente es
    // peor que no tenerlo — los crawlers lo terminan ignorando entero.
    ...(route.path === "/logbook" && lastEntryUpdate !== undefined
      ? { lastModified: lastEntryUpdate }
      : {}),
  }));

  const logbookRoutes: MetadataRoute.Sitemap = entries.map((entry) => ({
    url: absoluteUrl(`/logbook/${entry.slug}`),
    lastModified: new Date(entry.updatedAt),
  }));

  return [...staticRoutes, ...logbookRoutes];
}
