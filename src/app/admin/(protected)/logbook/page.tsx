import Link from "next/link";
import { listAllEntries } from "@/lib/logbook/queries";

/**
 * Listado de notas del panel, borradores incluidos.
 *
 * Es un Server Component y consulta directo con la query, sin pasar por
 * `/api/admin/logbook`: el layout de `(protected)` ya verificó la sesión, y una
 * llamada HTTP a la propia app sería un salto de red para leer lo mismo.
 *
 * `dynamic = "force-dynamic"` porque acá los borradores tienen que verse al
 * instante: una nota recién guardada que no aparece parece que se perdió.
 */
export const dynamic = "force-dynamic";

const STATUS_STYLES = {
  published: "text-green-500 bg-green-500/10 border-green-500/20",
  draft: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
} as const;

const STATUS_LABELS = {
  published: "Publicada",
  draft: "Borrador",
} as const;

export default async function AdminLogbookPage() {
  const entries = await listAllEntries();

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-sm font-bold text-foreground shrink-0">Logbook</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/testimonials"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Testimonios
          </Link>
          <Link
            href="/admin/logbook/new"
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap"
          >
            Nueva nota
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          Todavía no hay notas.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/admin/logbook/${entry.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:border-brand/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="text-sm font-semibold text-foreground">
                  {entry.title}
                </h2>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[entry.status]}`}
                >
                  {STATUS_LABELS[entry.status]}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                /logbook/{entry.slug}
              </p>

              {entry.summary && (
                <p className="mt-2 text-xs text-foreground/70 line-clamp-2">
                  {entry.summary}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <time
                  className="text-[11px] text-muted-foreground"
                  dateTime={entry.publishedAt}
                >
                  {formatDate(entry.publishedAt)}
                </time>
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
