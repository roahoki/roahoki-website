import type { LogbookEntry } from "@/db/schema";
import { renderLlmsTxt } from "@/lib/llms-txt";
import { listPublishedEntries } from "@/lib/logbook/queries";

/**
 * `/llms.txt`.
 *
 * Es un route handler y no un archivo en `public/`: el índice incluye las notas
 * del logbook, así que tiene que salir de la base y quedar al día solo. Un
 * archivo estático habría que reescribirlo a mano en cada publicación, que es
 * exactamente la clase de paso que se olvida.
 *
 * La carpeta se llama `llms.txt` con punto incluido; App Router la sirve tal
 * cual en la raíz.
 */
export const revalidate = 3600;

export async function GET() {
  let entries: LogbookEntry[] = [];
  try {
    entries = await listPublishedEntries();
  } catch {
    // Igual que en `sitemap.ts` y `/logbook`: sin base se sirve el índice con
    // las páginas estáticas en vez de devolver un 500. Un `llms.txt` incompleto
    // es mucho mejor que uno que no responde.
  }

  return new Response(renderLlmsTxt(entries), {
    headers: {
      // `charset` explícito: el archivo lleva tildes y ñ, y sin declararlo
      // algunos clientes asumen latin-1 y las rompen.
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
