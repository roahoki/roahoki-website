import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { palette } from "@/lib/brand/palette";
import { bricolage } from "@/lib/fonts";
import "../globals.css";

/**
 * Layout raíz de las páginas con la marca nueva: el home (que es el logbook) y
 * cada entrada en `/logbook/[slug]`. Bricolage, papel y tinta, header y footer
 * de roahoki.
 *
 * No hay `src/app/layout.tsx`: cada raíz del árbol trae el suyo, igual que
 * `(site)` y `admin`. Es un route group para que `/` y `/logbook/[slug]`
 * compartan layout sin que `brand` aparezca en la URL.
 *
 * Va solo en claro (brand book §5.3: la página es papel y el texto es tinta),
 * así que no usa `Providers`: sin tema que alternar, `next-themes` sobra.
 * `colorScheme: "light"` le avisa al navegador para que tampoco oscurezca
 * por su cuenta los controles nativos.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: palette.paper,
};

export const metadata: Metadata = {
  // Base para resolver las URLs relativas de Open Graph. Sin esto Next cae a
  // localhost en desarrollo y la preview del link apunta a un host inexistente.
  //
  // TODO: la PR #19 (`chore/metadata-base`) mueve el dominio a `@/lib/site`.
  // Cuando se mergee, importar `siteUrl` de ahí en vez de repetirlo. Va con
  // `www` porque el apex responde 308 hacia él y los scrapers de Instagram y
  // WhatsApp no siempre siguen el redirect.
  metadataBase: new URL("https://www.roahoki.com"),
  title: "roahoki",
};

export default function LogbookRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={bricolage.variable}>
      <body className="flex min-h-screen flex-col bg-paper font-brand text-ink antialiased selection:bg-leaf selection:text-paper">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
