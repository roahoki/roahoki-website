import Image from "next/image";
import Link from "next/link";
import type { LogbookEntry } from "@/db/schema";
import {
  COVER_FOCUS_CLASS,
  ENTRY_FORMAT_LABELS,
} from "@/lib/logbook/entry-format";
import { formatEntryDateShort } from "@/lib/logbook/format";

export type EntryCardData = Pick<
  LogbookEntry,
  | "number"
  | "slug"
  | "title"
  | "summary"
  | "coverImageUrl"
  | "coverFocus"
  | "format"
  | "tags"
  | "publishedAt"
>;

/**
 * La tarjeta de una nota en el home (brand book §7.4).
 *
 * Agrupada por proximidad: la portada separada del texto; número, fecha,
 * formato, título y extracto juntos; los tags un poco aparte. La portada es
 * 2:1. Sin foto —el caso más común— es tipográfica: el número de la entrada
 * sobre verde botella, así la grilla no se rompe cuando falta imagen.
 */
export function EntryCard({ entry }: { entry: EntryCardData }) {
  const href = `/logbook/${entry.slug}`;

  return (
    <article className="flex flex-col gap-4 md:gap-3">
      <Link
        href={href}
        className="group flex flex-col gap-5 rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-leaf md:gap-4"
      >
        <div className="relative aspect-[2/1] overflow-hidden rounded-md bg-bottle">
          {entry.coverImageUrl ? (
            <Image
              src={entry.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 325px, (min-width: 640px) 50vw, 100vw"
              className={`object-cover ${COVER_FOCUS_CLASS[entry.coverFocus]}`}
            />
          ) : (
            <p
              aria-hidden="true"
              className="absolute bottom-0 left-0 p-5 text-cover-number text-paper"
            >
              #{entry.number}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 md:gap-1.5">
          <p className="flex flex-wrap gap-x-3 text-card-meta text-faded">
            <span>#{entry.number}</span>
            <time dateTime={entry.publishedAt}>
              {formatEntryDateShort(entry.publishedAt)}
            </time>
            {entry.format && <span>{ENTRY_FORMAT_LABELS[entry.format]}</span>}
          </p>
          <h2 className="text-card-title-sm text-ink decoration-1 underline-offset-4 group-hover:underline md:text-card-title">
            {entry.title}
          </h2>
          {entry.summary && (
            <p className="text-body text-ink">{entry.summary}</p>
          )}
        </div>
      </Link>

      {entry.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="tags">
          {entry.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-bottle px-2.5 py-0.5 text-tag text-paper"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
