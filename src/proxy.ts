import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // `logbook` se excluye junto a `api` y `admin`: el middleware de next-intl
  // redirige lo que atrapa a `/<locale>/...`, y estas rutas nacen ya
  // "post-i18n", en español y sin prefijo de idioma. Sin excluirlas,
  // `/logbook/una-nota` se iría a `/es/logbook/una-nota`, que no existe.
  matcher: ["/((?!api|admin|logbook|_next|_vercel|.*\\..*).*)"],
};
