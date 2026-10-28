/**
 * El token del link personal: `/cumple/<token>`.
 *
 * El token **es** el invitado: no hay cuenta ni clave detrás. Por eso tiene que
 * ser imposible de adivinar: 12 caracteres en base62 son ~71 bits, y con 30
 * invitados la probabilidad de acertarle a uno probando al azar es nula.
 *
 * Sale de `crypto.getRandomValues`, nunca de `Math.random`, que no es
 * criptográfico y se puede predecir. El rechazo de los bytes ≥ 248 evita el
 * sesgo de módulo: 256 no es múltiplo de 62, y sin descartarlos las primeras
 * letras saldrían un poco más seguido que las demás.
 */

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const TOKEN_LENGTH = 12;

/** Lo que se valida antes de ir a la base: largo y alfabeto exactos. */
export const TOKEN_PATTERN = /^[0-9A-Za-z]{12}$/;

const LIMIT = 256 - (256 % ALPHABET.length);

export function generateToken(): string {
  let token = "";
  while (token.length < TOKEN_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH * 2));
    for (const byte of bytes) {
      if (byte >= LIMIT) continue;
      token += ALPHABET[byte % ALPHABET.length];
      if (token.length === TOKEN_LENGTH) break;
    }
  }
  return token;
}

export function isToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}
