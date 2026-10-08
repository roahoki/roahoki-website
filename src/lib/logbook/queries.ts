import { and, asc, desc, eq, gt, like, lt, sql } from "drizzle-orm";
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

/**
 * Crea una nota con el número siguiente al más alto (#27, #28…). Los borradores
 * también reciben el suyo: el número es de la nota, no de su estado.
 *
 * El máximo se calcula dentro del mismo `insert` y no con un `select` previo,
 * para no abrir una ventana entre leerlo y usarlo. Si dos altas simultáneas
 * calcularan el mismo número, el índice único rechaza la segunda: con un solo
 * autor es casi imposible, y fallar es mejor que duplicar. Borrar la nota más
 * nueva deja su número libre para la siguiente.
 */
export async function createEntry(
  input: Omit<NewLogbookEntry, "id" | "number" | "createdAt" | "updatedAt">,
): Promise<LogbookEntry> {
  const [created] = await getDb()
    .insert(logbookEntries)
    .values({
      ...input,
      number: sql`(select coalesce(max(${logbookEntries.number}), 0) + 1 from ${logbookEntries})`,
    })
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
  // El número no se edita: es el orden en que nacieron las notas.
  changes: Partial<Omit<NewLogbookEntry, "id" | "number" | "createdAt">>,
): Promise<LogbookEntry | undefined> {
  const [updated] = await getDb()
    .update(logbookEntries)
    .set({ ...changes, updatedAt: sql`now()` })
    .where(eq(logbookEntries.id, id))
    .returning();

  return updated;
}

/**
 * Borra una nota y devuelve su slug. `undefined` si el id no existía.
 *
 * Devuelve el slug y no un booleano porque quien borra necesita saber **qué
 * ruta pública dejó de existir**, para invalidarle el caché. Leerlo antes con
 * un `select` aparte sería una query de más y una carrera: entre esa lectura y
 * el borrado el slug puede cambiar. El `returning` lo trae del mismo statement
 * que borra, así que es el valor que efectivamente se fue.
 */
export async function deleteEntry(id: string): Promise<string | undefined> {
  const [deleted] = await getDb()
    .delete(logbookEntries)
    .where(eq(logbookEntries.id, id))
    .returning({ slug: logbookEntries.slug });

  return deleted?.slug;
}

export type EntryNeighbor = Pick<LogbookEntry, "number" | "slug" | "title">;

/**
 * La nota publicada anterior y la siguiente a `number`, para la navegación al
 * pie de cada entrada. Se ordena por número y no por fecha: el número es el
 * orden que el visitante ve en cada tarjeta, y "anterior" tiene que ser la #24
 * cuando está leyendo la #25. Los borradores se saltean: tienen número pero no
 * página pública.
 */
export async function getEntryNeighbors(number: number): Promise<{
  previous: EntryNeighbor | undefined;
  next: EntryNeighbor | undefined;
}> {
  const columns = {
    number: logbookEntries.number,
    slug: logbookEntries.slug,
    title: logbookEntries.title,
  };
  const published = eq(logbookEntries.status, "published");

  const [[previous], [next]] = await Promise.all([
    getDb()
      .select(columns)
      .from(logbookEntries)
      .where(and(published, lt(logbookEntries.number, number)))
      .orderBy(desc(logbookEntries.number))
      .limit(1),
    getDb()
      .select(columns)
      .from(logbookEntries)
      .where(and(published, gt(logbookEntries.number, number)))
      .orderBy(asc(logbookEntries.number))
      .limit(1),
  ]);

  return { previous, next };
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
