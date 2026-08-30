import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "../globals.css";

/**
 * Layout raíz del logbook.
 *
 * No hay `src/app/layout.tsx`: cada raíz del árbol trae el suyo, igual que
 * `(site)` y `admin`.
 *
 * Usa `Providers` y no `className="dark"` fijo como el panel: estas páginas son
 * públicas y deben respetar el tema del sitio, no forzar oscuro.
 */

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
  title: "Logbook — roahoki",
  icons: { icon: "/favicon.ico" },
};

export default function LogbookRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
