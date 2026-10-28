import type { Metadata, Viewport } from "next";
import { palette } from "@/lib/brand/palette";
import { bricolage } from "@/lib/fonts";
import { siteUrl } from "@/lib/site";
import "../globals.css";

/**
 * Raíz propia del cumpleaños: sin el header ni el footer del logbook, solo en
 * claro como el resto de la marca.
 *
 * Nada de acá se indexa. Cada página existe detrás de un token personal y
 * muestra el nombre de alguien; no tiene nada que hacer en un buscador. No se
 * agrega a `robots.ts` porque WhatsApp necesita poder leer la página para
 * armar la vista previa del link.
 */
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "los 25 de joky",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: palette.paper,
};

export default function BirthdayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={bricolage.variable}>
      <body className="min-h-screen bg-paper font-brand text-ink antialiased selection:bg-leaf selection:text-paper">
        {children}
      </body>
    </html>
  );
}
