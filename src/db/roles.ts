import { pgRole } from "drizzle-orm/pg-core";

/**
 * Roles de Postgres que Supabase crea en cada proyecto. Se declaran con
 * `.existing()` para que Drizzle los pueda referenciar en las políticas sin
 * intentar crearlos en una migración.
 *
 * - `anon`: el rol con el que llega cualquier visitante a través de la API REST
 *   usando la clave pública. Todo lo que este rol puede hacer, lo puede hacer
 *   internet entero.
 * - `service_role`: saltea RLS. Solo se usa desde el servidor.
 */

export const anonRole = pgRole("anon").existing();
export const serviceRole = pgRole("service_role").existing();
