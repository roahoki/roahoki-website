import type { Metadata } from "next";
import Link from "next/link";
import type { LogbookEntry } from "@/db/schema";
import { formatEntryDate } from "@/lib/logbook/format";
import { listPublishedEntries } from "@/lib/logbook/queries";

/**
 * El listado público del logbook.
 *
 * ISR y no render dinámico: el contenido cambia cuando se publica una nota, no
 * en cada visita. Una hora es el compromiso entre servir HTML cacheado a quien
 * llega desde una historia de Instagram y no tener que esperar un deploy para
 * que aparezca lo recién publicado.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Logbook — roahoki",
  description:
    "Notas sobre lo que voy construyendo y aprendiendo: desarrollo, bases de datos y oficio.",
  alternates: { canonical: "/logbook" },
};

export default async function LogbookPage() {
  let entries: LogbookEntry[] = [];
  try {
    entries = await listPublishedEntries();
  } catch {
    // Mismo criterio que `generateStaticParams` en `[slug]/page.tsx` y que
    // `landing-testimonials.tsx`: si la base no responde durante el build se
    // muestra el estado vacío, en vez de voltear el deploy.
    //
    // El costo es que un fallo al buildear deja el listado vacío cacheado hasta
    // que `revalidate` lo renueve. Es un techo de una hora y se cura solo; que
    // no se pueda desplegar nada hasta que la base vuelva, no.
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
      <header className="mb-10">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← roahoki
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-foreground">
          Logbook
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Notas sobre lo que voy construyendo y aprendiendo.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12">
          Todavía no hay notas publicadas.
        </p>
      ) : (
        <ul className="space-y-8">
          {entries.map((entry) => (
            <li key={entry.id}>
              <article>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={entry.publishedAt}
                >
                  {formatEntryDate(entry.publishedAt)}
                </time>

                <h2 className="mt-1 text-lg font-bold">
                  <Link
                    href={`/logbook/${entry.slug}`}
                    className="text-foreground hover:text-brand transition-colors"
                  >
                    {entry.title}
                  </Link>
                </h2>

                {entry.summary && (
                  <p className="mt-1.5 text-sm text-foreground/70 leading-relaxed">
                    {entry.summary}
                  </p>
                )}

                {entry.tags.length > 0 && (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
