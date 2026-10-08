import type { Metadata, Viewport } from "next";
import { palette } from "@/lib/brand/palette";
import { bricolage } from "@/lib/fonts";
import "../globals.css";

/**
 * Layout raíz del panel, con la marca del sitio: se escribe sobre el mismo
 * papel en que se lee (brand book §7.4, admin). Solo en claro, como el sitio.
 *
 * Las secciones que todavía no se rediseñaron (stats, testimonios) usan los
 * tokens de Shadcn: sin la clase `dark` caen en su versión clara, que convive
 * con el papel.
 */

export const metadata: Metadata = { title: "panel — roahoki" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: palette.paper,
};

export default function AdminRootLayout({
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
