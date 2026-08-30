import { type NextRequest, NextResponse } from "next/server";

/**
 * El middleware —renombrado `proxy.ts` en Next 16—.
 *
 * Su única razón de ser es inyectar el pathname como request header: el layout
 * protegido lo lee para armar el `?next=` del redirect al login, y no tiene
 * otra forma de conocerlo. Hasta que se quitó next-intl también resolvía el
 * prefijo de idioma de las rutas públicas; ahora el sitio es solo español y
 * esas rutas no necesitan pasar por acá.
 */
export default function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Solo `/admin`: es lo único que necesita el `x-pathname`. Antes el matcher
  // era al revés —atrapaba todo y excluía lo que no debía llevar prefijo de
  // idioma—, y cada ruta pública nueva había que acordarse de agregarla a la
  // lista. Ese fallo silencioso ya no existe.
  matcher: ["/admin/:path*"],
};
