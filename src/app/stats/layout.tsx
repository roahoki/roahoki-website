import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "../globals.css";

/**
 * Layout raíz de `/stats`.
 *
 * No hay `src/app/layout.tsx`: cada raíz del árbol trae el suyo, igual que
 * `(site)`, `(brand)` y `admin`.
 *
 * Usa `Providers`: hasta rediseñarse, esta página sigue el tema del visitante.
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
  metadataBase: siteUrl,
  title: "Stats — roahoki",
};

export default function StatsRootLayout({
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
