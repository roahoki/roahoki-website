import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  // Las rutas admin no pasan por next-intl, pero necesitamos inyectar el
  // pathname como request header para que el layout protegido pueda leerlo
  // y armar el `?next=` del redirect al login.
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return intlMiddleware(req);
}

export const config = {
  // `admin` ya no se excluye: el middleware lo maneja explícitamente arriba.
  // `logbook` y `stats` sí, porque next-intl redirige lo que atrapa a
  // `/<locale>/...` y esas rutas nacen ya en español y sin prefijo. Excluirlas
  // acá —en vez de darles una rama en el middleware como a `admin`— es lo
  // correcto justamente porque no necesitan nada de él: `admin` está arriba
  // solo para inyectarle el `x-pathname` al layout protegido.
  matcher: ["/((?!api|logbook|stats|_next|_vercel|.*\\..*).*)"],
};
