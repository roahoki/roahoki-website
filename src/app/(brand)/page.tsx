import type { Metadata } from "next";
import { AdminFab } from "@/components/admin/admin-fab";
import { EntryCard } from "@/components/entry-card";
import type { LogbookEntry } from "@/db/schema";
import { listPublishedEntries } from "@/lib/logbook/queries";

/**
 * El home: el logbook directo (brand book §7.4, "el sitio es el archivo, así
 * que el logbook es el sitio").
 *
 * ISR y no render dinámico: el contenido cambia cuando se publica una nota, no
 * en cada visita. Una hora es el compromiso entre servir HTML cacheado a quien
 * llega desde una historia de Instagram y no tener que esperar un deploy para
 * que aparezca lo recién publicado; publicar desde el panel invalida esta
 * página al instante (`revalidateLogbook`).
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "roahoki",
  description:
    "El logbook de roahoki: lo que voy construyendo y aprendiendo, en notas cortas.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  let entries: LogbookEntry[] = [];
  try {
    entries = await listPublishedEntries();
  } catch {
    // Mismo criterio que `generateStaticParams` en `logbook/[slug]/page.tsx`:
    // si la base no responde durante el build se muestra el estado vacío, en
    // vez de voltear el deploy. El costo es un listado vacío cacheado hasta que
    // `revalidate` lo renueve; que no se pueda desplegar nada hasta que la base
    // vuelva, no.
  }

  return (
    <main className="mx-auto w-full max-w-[1055px] px-4 pt-8 pb-14 md:px-8 md:pt-12 md:pb-20 lg:px-0">
      <h1 className="sr-only">logbook de roahoki</h1>
      {entries.length === 0 ? (
        <p className="py-16 text-center text-body text-faded">
          Todavía no hay notas publicadas.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-y-[60px] sm:grid-cols-2 sm:gap-x-10 md:gap-y-14 lg:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
      <AdminFab />
    </main>
  );
}
