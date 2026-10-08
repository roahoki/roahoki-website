import Link from "next/link";
import type { EntryNeighbor } from "@/lib/logbook/queries";

const linkClass =
  "text-entry-meta text-leaf underline-offset-4 hover:underline focus-visible:underline";

/**
 * La navegación al pie de una entrada: anterior, el logbook y siguiente
 * (brand book §7.4). En móvil se apila; en escritorio son tres columnas, con
 * la del medio centrada y la de la derecha alineada a la derecha.
 */
export function EntryNeighbors({
  previous,
  next,
}: {
  previous: EntryNeighbor | undefined;
  next: EntryNeighbor | undefined;
}) {
  return (
    <nav
      aria-label="otras entradas"
      className="grid grid-cols-1 gap-5 border-t border-rule pt-6 md:grid-cols-3 md:gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-card-meta text-faded">anterior</span>
        {previous ? (
          <Link href={`/logbook/${previous.slug}`} className={linkClass}>
            #{previous.number} {previous.title}
          </Link>
        ) : (
          <span className="text-entry-meta text-faded">es la primera</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 md:items-center">
        <span className="text-card-meta text-faded">todo</span>
        <Link href="/" className={linkClass}>
          logbook
        </Link>
      </div>
      <div className="flex flex-col gap-1.5 md:items-end md:text-right">
        <span className="text-card-meta text-faded">siguiente</span>
        {next ? (
          <Link href={`/logbook/${next.slug}`} className={linkClass}>
            #{next.number} {next.title}
          </Link>
        ) : (
          <span className="text-entry-meta text-faded">es la más nueva</span>
        )}
      </div>
    </nav>
  );
}
