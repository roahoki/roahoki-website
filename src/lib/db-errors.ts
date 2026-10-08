/**
 * Reconocimiento de errores de Postgres que el llamador puede manejar.
 *
 * El driver `postgres.js` propaga el `code` de cinco caracteres del error, que
 * es lo único estable: el mensaje cambia entre versiones y está traducido según
 * el `lc_messages` del servidor.
 */

/**
 * `23505` es `unique_violation`. Con `constraint`, además exige que el índice
 * que falló sea ese: una tabla con dos índices únicos necesita saber cuál de
 * los dos chocó para decirle a quien escribe qué corregir.
 */
export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  if (pgField(error, "code") !== "23505") return false;
  return (
    constraint === undefined || pgField(error, "constraint_name") === constraint
  );
}

function pgField(error: unknown, field: string): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}
