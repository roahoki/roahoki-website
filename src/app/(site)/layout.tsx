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
 * Va en el route group `(site)` y no en `src/app/layout.tsx` porque `admin` y
 * `logbook` traen el suyo: un único layout raíz obligaría a los tres a
 * compartir `<html>`, y el panel lo necesita fijo en oscuro mientras las
 * páginas públicas respetan el tema del visitante.
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
  icons: {
    icon: "/favicon.ico",
  },
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
