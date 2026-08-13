/**
 * Reconocimiento de errores de Postgres que el llamador puede manejar.
 *
 * El driver `postgres.js` propaga el `code` de cinco caracteres del error, que
 * es lo único estable: el mensaje cambia entre versiones y está traducido según
 * el `lc_messages` del servidor.
 */

/** `23505` es `unique_violation`. */
export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}

function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
