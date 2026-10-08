import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type React from "react";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "../globals.css";

/**
 * Layout raíz del sitio público.
 *
 * Va en el route group `(site)` y no en `src/app/layout.tsx` porque `(brand)`,
 * `admin` y `stats` traen el suyo: un único layout raíz obligaría a todos a
 * compartir `<html>`, y estas páginas anteriores siguen el tema del visitante
 * mientras las rediseñadas van solo en claro.
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
  // Base para resolver URLs relativas (Open Graph, canonicals). Sin esto Next
  // cae a localhost en dev y avisa en build. El dominio vive en `@/lib/site`.
  metadataBase: siteUrl,
  title: "Joaquín",
  description: "Software Engineer, Developer, and Tutor.",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
