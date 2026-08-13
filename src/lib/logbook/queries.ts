import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  type LogbookEntry,
  logbookEntries,
  type NewLogbookEntry,
} from "@/db/schema";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Todo el acceso a `logbook_entries` pasa por acá.
 *
 * El filtro que importa es `status = 'published'`. Este cliente conecta como
 * dueño de la base y **se saltea RLS** (ver `src/db/index.ts`), así que las
 * políticas de la PR 10 no filtran nada de lo que pase por este archivo: son la
 * red de seguridad para lo que use la anon key desde el browser, no para esto.
 *
 * Dicho de otro modo: acá el filtro explícito **es la única barrera** entre un
 * borrador y la página pública. Por eso hay funciones separadas para lo público
 * y lo del panel, en vez de un parámetro `includeDrafts` que se pueda olvidar.
 */

/** Lo que ve cualquier visitante: publicadas, de la más nueva a la más vieja. */
export async function listPublishedEntries(
  limit?: number,
): Promise<LogbookEntry[]> {
  const query = getDb()
    .select()
    .from(logbookEntries)
    .where(eq(logbookEntries.status, "published"))
    .orderBy(desc(logbookEntries.publishedAt));

  return limit === undefined ? query : query.limit(limit);
}

/**
 * Una nota publicada por su slug. `undefined` si no existe o es borrador.
 *
 * El filtro por estado va acá y no en la página: si la página lo hiciera,
 * `/logbook/un-borrador` devolvería la nota y la vista tendría que acordarse de
 * esconderla.
 */
export async function getPublishedEntryBySlug(
  slug: string,
): Promise<LogbookEntry | undefined> {
  const [entry] = await getDb()
    .select()
    .from(logbookEntries)
    .where(
      and(
        eq(logbookEntries.slug, slug),
        eq(logbookEntries.status, "published"),
      ),
    )
    .limit(1);

  return entry;
}

/** Todas, sin filtrar por estado. Solo para el panel. */
export async function listAllEntries(): Promise<LogbookEntry[]> {
  return getDb()
    .select()
    .from(logbookEntries)
    .orderBy(desc(logbookEntries.publishedAt));
}

/** Una nota por id, en cualquier estado. Solo para el panel. */
export async function getEntryById(
  id: string,
): Promise<LogbookEntry | undefined> {
  const [entry] = await getDb()
    .select()
    .from(logbookEntries)
    .where(eq(logbookEntries.id, id))
    .limit(1);

  return entry;
}

/**
 * Un slug libre a partir de un título.
 *
 * Solo consulta los slugs que empiezan con la base, en vez de traerlos todos:
 * son los únicos con los que puede colisionar.
 *
 * Hay una carrera teórica entre este `select` y el `insert` posterior. No se
 * resuelve con una transacción porque el índice único de la tabla ya la cubre:
 * si dos altas simultáneas eligen el mismo slug, la segunda falla en la base.
 * Con un solo autor escribiendo desde el celular, es un caso que no ocurre.
 */
export async function availableSlugFor(title: string): Promise<string> {
  const base = slugify(title);
  if (base === "") return "";

  const rows = await getDb()
    .select({ slug: logbookEntries.slug })
    .from(logbookEntries)
    .where(like(logbookEntries.slug, `${base}%`));

  return uniqueSlug(
    base,
    rows.map((row) => row.slug),
  );
}

export async function createEntry(
  input: Omit<NewLogbookEntry, "id" | "createdAt" | "updatedAt">,
): Promise<LogbookEntry> {
  const [created] = await getDb()
    .insert(logbookEntries)
    .values(input)
    .returning();

  return created;
}

/**
 * Actualiza los campos presentes en `changes`. `undefined` si el id no existe.
 *
 * `updatedAt` lo pone la query y no el llamador: es la clase de campo que se
 * olvida en uno de los tres lugares que actualizan, y entonces miente.
 */
export async function updateEntry(
  id: string,
  changes: Partial<Omit<NewLogbookEntry, "id" | "createdAt">>,
): Promise<LogbookEntry | undefined> {
  const [updated] = await getDb()
    .update(logbookEntries)
    .set({ ...changes, updatedAt: sql`now()` })
    .where(eq(logbookEntries.id, id))
    .returning();

  return updated;
}

/** Borra una nota. `false` si el id no existía. */
export async function deleteEntry(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(logbookEntries)
    .where(eq(logbookEntries.id, id))
    .returning({ id: logbookEntries.id });

  return deleted.length > 0;
}

/** Los slugs de todas las notas publicadas. Para el sitemap y el feed. */
export async function listPublishedSlugs(): Promise<string[]> {
  const rows = await getDb()
    .select({ slug: logbookEntries.slug })
    .from(logbookEntries)
    .where(eq(logbookEntries.status, "published"))
    .orderBy(desc(logbookEntries.publishedAt));

  return rows.map((row) => row.slug);
}
