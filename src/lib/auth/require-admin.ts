import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * Autorización de los route handlers del panel.
 *
 * Se extrae acá porque a partir de esta PR hay cinco handlers que la necesitan,
 * y una comprobación de autorización copiada cinco veces es una que en algún
 * momento se va a olvidar en la sexta.
 *
 * Devuelve `null` cuando hay sesión válida, y la respuesta 401 ya armada cuando
 * no. Ese contrato hace que el llamador tenga que escribir una línea que se lee
 * como una guarda, y que olvidarse del `return` sea un error de tipos:
 *
 *     const denied = await requireAdmin();
 *     if (denied) return denied;
 *
 * El layout de `/admin/(protected)` protege las **páginas**; esto protege la
 * **API**. Son dos puertas distintas: pegarle a `/api/admin/...` no pasa por
 * ningún layout.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();

  if (await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)) {
    return null;
  }

  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}
