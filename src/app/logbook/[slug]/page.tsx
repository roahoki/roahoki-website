import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEntryDate } from "@/lib/logbook/format";
import {
  getPublishedEntryBySlug,
  listPublishedSlugs,
} from "@/lib/logbook/queries";
import { MarkdownContent, markdownToPlainText } from "@/lib/markdown";

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

  return (
    <main className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
      <Link
        href="/logbook"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Logbook
      </Link>

      <article className="mt-6">
        <header className="mb-8">
          <time
            className="text-xs text-muted-foreground"
            dateTime={entry.publishedAt}
          >
            {formatEntryDate(entry.publishedAt)}
          </time>

          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {entry.title}
          </h1>

          {entry.summary && (
            <p className="mt-3 text-base text-foreground/70 leading-relaxed">
              {entry.summary}
            </p>
          )}

          {entry.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
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
        </header>

        <div className="prose-logbook">
          <MarkdownContent>{entry.bodyMd}</MarkdownContent>
        </div>
      </article>
    </main>
  );
}
