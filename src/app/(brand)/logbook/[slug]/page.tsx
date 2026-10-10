import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminFab } from "@/components/admin/admin-fab";
import { CopyLinkButton } from "@/components/entry/copy-link-button";
import { EntryNeighbors } from "@/components/entry/entry-neighbors";
import { InstagramDmLink } from "@/components/instagram-dm-link";
import { ENTRY_FORMAT_LABELS } from "@/lib/logbook/entry-format";
import { formatEntryDateShort } from "@/lib/logbook/format";
import {
  getEntryNeighbors,
  getPublishedEntryBySlug,
  listPublishedSlugs,
} from "@/lib/logbook/queries";
import { MarkdownContent, markdownToPlainText } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

/**
 * Prerenderiza las notas que ya existen al momento del build.
 *
 * Las que se publiquen después igual funcionan: se generan en la primera visita
 * y quedan cacheadas. Sin esto, la primera persona que abra un link recién
 * compartido espera la consulta a la base — y esa primera persona suele ser
 * quien lo compartió, mirando si quedó bien.
 *
 * Si la base no responde se devuelve la lista vacía en vez de propagar el error.
 * El prerender es una optimización: sin él las notas se generan igual, en su
 * primera visita. Dejar que reviente convierte una optimización en un requisito
 * y **el build pasa a depender de la base** — una credencial de runtime y un
 * servicio externo, justo lo que `src/db/index.ts` evita al abrir la conexión
 * recién en la primera query. Con el error propagándose, una migración sin
 * aplicar o un pooler caído voltean el deploy entero.
 */
export async function generateStaticParams() {
  try {
    const slugs = await listPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getPublishedEntryBySlug(slug);

  if (!entry) return { title: "Nota no encontrada — roahoki" };

  // Sin `summary` se deriva del cuerpo: `og:description` vacío deja la preview
  // del link con solo el título.
  const description = entry.summary ?? markdownToPlainText(entry.bodyMd, 200);

  return {
    title: `${entry.title} — roahoki`,
    description,
    alternates: { canonical: `/logbook/${entry.slug}` },
    openGraph: {
      type: "article",
      title: entry.title,
      description,
      url: `/logbook/${entry.slug}`,
      publishedTime: entry.publishedAt,
      tags: [...entry.tags],
      ...(entry.coverImageUrl ? { images: [entry.coverImageUrl] } : {}),
    },
    twitter: {
      card: entry.coverImageUrl ? "summary_large_image" : "summary",
      title: entry.title,
      description,
      ...(entry.coverImageUrl ? { images: [entry.coverImageUrl] } : {}),
    },
  };
}

export default async function LogbookEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getPublishedEntryBySlug(slug);

  // `getPublishedEntryBySlug` filtra por estado, así que un borrador cae acá
  // igual que un slug inexistente: desde afuera no se distingue que existe.
  if (!entry) notFound();

  const neighbors = await getEntryNeighbors(entry.number);

  return (
    <main className="px-4 pt-8 pb-12 md:px-8 md:pt-14 md:pb-16">
      {/* Dos anchos (brand book §7.4): el texto a 68ch (680 px), y la portada,
          las imágenes y la navegación a 896 px. */}
      <article className="mx-auto flex max-w-[896px] flex-col gap-8">
        <header className="mx-auto flex w-full max-w-[680px] flex-col gap-5">
          <p className="flex flex-wrap gap-x-3 text-entry-meta text-faded">
            <span>#{entry.number}</span>
            <time dateTime={entry.publishedAt}>
              {formatEntryDateShort(entry.publishedAt)}
            </time>
            {entry.format && <span>{ENTRY_FORMAT_LABELS[entry.format]}</span>}
          </p>
          <h1 className="text-entry-title text-ink">{entry.title}</h1>
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
        </header>

        {entry.coverImageUrl && (
          // La foto entera, sin recorte: el recorte 2:1 es de la tarjeta. Es
          // `<img>` y no `next/image` porque no se conocen sus dimensiones,
          // igual que las imágenes del cuerpo en `src/lib/markdown.tsx`.
          // biome-ignore lint/performance/noImgElement: dimensiones desconocidas
          <img
            src={entry.coverImageUrl}
            alt=""
            className="h-auto w-full rounded-md"
          />
        )}

        <div className="prose-entry mx-auto w-full max-w-[680px]">
          <MarkdownContent>{entry.bodyMd}</MarkdownContent>
        </div>

        <footer className="mx-auto flex w-full max-w-[680px] flex-col gap-5">
          <p className="text-signature text-leaf">:)</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-rule pt-4">
            <CopyLinkButton url={absoluteUrl(`/logbook/${entry.slug}`)} />
            <InstagramDmLink className="text-action text-leaf underline-offset-4 hover:underline focus-visible:underline">
              respóndeme por instagram
            </InstagramDmLink>
          </div>
        </footer>
      </article>

      <div className="mx-auto mt-12 max-w-[896px]">
        <EntryNeighbors {...neighbors} />
      </div>
      <AdminFab entry={{ id: entry.id, title: entry.title }} />
    </main>
  );
}
