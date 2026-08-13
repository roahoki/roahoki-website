import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  type NewTestimonial,
  type Testimonial,
  type TestimonialStatus,
  testimonials,
} from "@/db/schema";

/**
 * Todo el acceso a la tabla `testimonials` pasa por acá.
 *
 * La regla del proyecto es que no haya queries inline en componentes ni en
 * route handlers: cuando la query vive junto a la vista, el mismo filtro se
 * reescribe en cada lugar y basta con olvidarse de uno para exponer datos. El
 * caso concreto acá es `status = 'approved'`: lo público nunca debe traer
 * pendientes ni rechazados, y con la lectura centralizada ese filtro se escribe
 * —y se prueba— una sola vez.
 *
 * Ojo: este cliente conecta como dueño de la base y **se saltea RLS** (ver
 * `src/db/index.ts`). Las políticas no filtran nada de lo que pase por acá, así
 * que el filtro explícito no es redundante: es la única barrera.
 */

/** Los aprobados, del más nuevo al más viejo. Lo que ve cualquier visitante. */
export async function listApprovedTestimonials(
  limit?: number,
): Promise<Testimonial[]> {
  const query = getDb()
    .select()
    .from(testimonials)
    .where(eq(testimonials.status, "approved"))
    .orderBy(desc(testimonials.createdAt));

  return limit === undefined ? query : query.limit(limit);
}

/** Todos, sin filtrar por estado. Solo para el panel de moderación. */
export async function listAllTestimonials(): Promise<Testimonial[]> {
  return getDb()
    .select()
    .from(testimonials)
    .orderBy(desc(testimonials.createdAt));
}

/**
 * Inserta un testimonio nuevo.
 *
 * `status` no se acepta por parámetro: siempre nace en `pending`. Si el estado
 * llegara desde afuera, el formulario público podría mandar `approved` y
 * saltarse la moderación entera.
 */
export async function createTestimonial(
  input: Omit<NewTestimonial, "id" | "status" | "createdAt">,
): Promise<Testimonial> {
  const [created] = await getDb()
    .insert(testimonials)
    .values({ ...input, status: "pending" })
    .returning();

  return created;
}

/** Modera un testimonio. Devuelve `undefined` si el id no existe. */
export async function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus,
): Promise<Testimonial | undefined> {
  const [updated] = await getDb()
    .update(testimonials)
    .set({ status })
    .where(eq(testimonials.id, id))
    .returning();

  return updated;
}

/** Borra un testimonio. Devuelve `false` si el id no existía. */
export async function deleteTestimonial(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(testimonials)
    .where(eq(testimonials.id, id))
    .returning({ id: testimonials.id });

  return deleted.length > 0;
}
