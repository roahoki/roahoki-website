import Link from "next/link";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import type { LogbookEntry } from "@/db/schema";
import { ENTRY_FORMAT_LABELS } from "@/lib/logbook/entry-format";
import { formatEntryDateShort, formatTimeAgo } from "@/lib/logbook/format";
import { listAllEntries } from "@/lib/logbook/queries";

/**
 * La lista de notas del panel, que es lo primero que se ve al entrar
 * (brand book §7.4, admin): los borradores arriba —es lo que se retoma— y
 * después las publicadas, de la más nueva a la más vieja.
 *
 * Es un Server Component y consulta directo con la query, sin pasar por
 * `/api/admin/logbook`: el layout de `(protected)` ya verificó la sesión, y una
 * llamada HTTP a la propia app sería un salto de red para leer lo mismo.
 *
 * `dynamic = "force-dynamic"` porque acá los borradores tienen que verse al
 * instante: una nota recién guardada que no aparece parece que se perdió.
 */
export const dynamic = "force-dynamic";

export default async function AdminLogbookPage() {
  const entries = await listAllEntries();
  const drafts = entries
    .filter((entry) => entry.status === "draft")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const published = entries
    .filter((entry) => entry.status === "published")
    .sort((a, b) => b.number - a.number);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar title="notas" />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pt-6 pb-28 md:px-0 md:pt-12 md:pb-16">
        {entries.length === 0 ? (
          <p className="py-16 text-center text-body text-faded">
            Todavía no hay notas. La primera empieza en "+ nueva nota".
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {drafts.length > 0 && (
              <EntrySection title="borradores" entries={drafts} />
            )}
            {published.length > 0 && (
              <EntrySection title="publicadas" entries={published} />
            )}
          </div>
        )}
      </main>

      {/* En el celular, la acción principal fija abajo: al alcance del pulgar
          sin scrollear. En escritorio vive en la barra de arriba. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper px-4 pt-3 pb-7 md:hidden">
        <Link
          href="/admin/logbook/new"
          className="flex h-11 items-center justify-center rounded-md border border-ink text-action text-ink"
        >
          + nueva nota
        </Link>
      </div>
    </div>
  );
}

function EntrySection({
  title,
  entries,
}: {
  title: string;
  entries: LogbookEntry[];
}) {
  return (
    <section aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="text-entry-meta text-faded">
        {title}
      </h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} className="border-b border-rule last:border-b-0">
            <EntryRow entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EntryRow({ entry }: { entry: LogbookEntry }) {
  const isDraft = entry.status === "draft";

  return (
    <Link
      href={`/admin/logbook/${entry.id}`}
      className="group flex flex-col gap-1 py-3.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-leaf"
    >
      <span className="flex flex-wrap gap-x-2.5 text-card-meta text-faded">
        <span>#{entry.number}</span>
        <span>
          {isDraft ? "sin fecha" : formatEntryDateShort(entry.publishedAt)}
        </span>
        {entry.format && <span>{ENTRY_FORMAT_LABELS[entry.format]}</span>}
      </span>
      <span className="text-card-title-sm text-ink decoration-1 underline-offset-4 group-hover:underline">
        {entry.title}
      </span>
      {isDraft && (
        <span className="text-card-meta text-leaf">
          sin publicar · editado {formatTimeAgo(entry.updatedAt)}
        </span>
      )}
    </Link>
  );
}
