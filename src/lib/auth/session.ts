import { adminPassword, adminSessionSecret } from "@/lib/env";

/**
 * Sesión del panel `/admin`: un token firmado con HMAC-SHA256 y con expiración.
 *
 * Antes la cookie guardaba el valor literal de `ADMIN_PASSWORD`, y el chequeo
 * era comparar la cookie contra la variable de entorno. Tres problemas:
 *
 * 1. **La contraseña viajaba en cada request y quedaba en disco.** Cualquier
 *    cosa con acceso a la cookie —una extensión, un backup del perfil del
 *    navegador, un log de proxy mal configurado— se llevaba la credencial
 *    misma, no una sesión.
 * 2. **No expiraba.** El `maxAge` de la cookie lo decide el cliente y se puede
 *    ignorar: una cookie copiada servía para siempre.
 * 3. **No se podía revocar** salvo cambiando la contraseña.
 *
 * Ahora la cookie lleva `<expiración>.<firma>`. La contraseña no sale nunca del
 * servidor, el token deja de valer solo, y modificar la fecha invalida la firma.
 *
 * Se usa Web Crypto y no `node:crypto` para que el mismo módulo sirva si algún
 * día el chequeo se mueve a `proxy.ts`, que corre en el runtime Edge.
 */

/** Nombre de la cookie. Se exporta para que login, logout y layout coincidan. */
export const SESSION_COOKIE = "admin_session";

/** 30 días — es un sitio de uso propio, un mes sin re-autenticar es razonable. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

/**
 * La clave de firma.
 *
 * Se prefiere `ADMIN_SESSION_SECRET`. Si no está, se deriva de
 * `ADMIN_PASSWORD`, que es el único secreto que el proyecto ya tiene
 * garantizado: así esta PR no rompe el deploy por una variable nueva sin
 * configurar, y se puede migrar a un secreto propio cuando se roten las
 * credenciales (pendiente en `TODO.md`).
 *
 * El prefijo separa los dominios de uso: la clave HMAC deja de ser literalmente
 * la contraseña, aunque se derive de ella.
 */
async function signingKey(): Promise<CryptoKey> {
  const secret = adminSessionSecret() ?? adminPassword();

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`roahoki-admin-session:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** base64url: el base64 estándar lleva `+`, `/` y `=`, que no van en una cookie. */
function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    // `atob` tira si el string no es base64 válido. Un token corrupto no es un
    // error del servidor: es simplemente un token que no verifica.
    return null;
  }
}

/**
 * Emite un token válido por `SESSION_TTL_MS`.
 *
 * `now` se inyecta para poder probar la expiración sin relojes falsos.
 */
export async function createSessionToken(
  now: number = Date.now(),
): Promise<string> {
  const expiresAt = String(now + SESSION_TTL_MS);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(expiresAt),
  );

  return `${expiresAt}.${toBase64Url(signature)}`;
}

/**
 * Verifica firma y vigencia.
 *
 * La comparación la hace `crypto.subtle.verify`, que es de tiempo constante:
 * un `===` sobre las firmas filtraría, por el tiempo de respuesta, cuántos
 * bytes iniciales acertó quien esté probando.
 *
 * El orden importa: **primero la firma, después la expiración**. Al revés, un
 * token con fecha futura inventada se descartaría por firma igual, pero el
 * código sugeriría que la fecha es confiable antes de haberla autenticado.
 */
export async function verifySessionToken(
  token: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const separator = token.indexOf(".");
  if (separator === -1) return false;

  const expiresAt = token.slice(0, separator);
  const signature = fromBase64Url(token.slice(separator + 1));
  if (signature === null) return false;

  // `/^\d+$/` y no `Number.isNaN`: `Number(" 12 ")` y `Number("0x10")` son
  // números válidos para JS y darían dos representaciones del mismo instante,
  // cada una con su firma.
  if (!/^\d+$/.test(expiresAt)) return false;

  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    signature as unknown as ArrayBuffer,
    encoder.encode(expiresAt),
  );
  if (!valid) return false;

  return Number(expiresAt) > now;
}

/** Las opciones de la cookie, en un solo lugar para que login y logout no divergan. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  };
}
