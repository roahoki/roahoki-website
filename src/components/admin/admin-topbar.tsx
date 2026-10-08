import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { LogoutButton } from "./logout-button";

const linkClass =
  "text-action text-leaf underline-offset-4 hover:underline focus-visible:underline";

const SECTIONS = [
  { label: "stats", href: "/admin/stats" },
  { label: "testimonios", href: "/admin/testimonials" },
  { label: "ver sitio", href: "/" },
] as const;

/**
 * Barra superior del panel (brand book §7.4, admin): la figura y el nombre de
 * la sección a la izquierda; a la derecha, las otras secciones y "+ nueva
 * nota".
 *
 * En móvil las secciones van en un `<details>`: abre y cierra sin JavaScript
 * y el navegador ya lo hace accesible con teclado. "+ nueva nota" en móvil no
 * va acá sino fija abajo, al alcance del pulgar (ver la página de notas).
 */
export function AdminTopbar({ title }: { title: string }) {
  return (
    <header className="border-b border-rule">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-5">
        <Link
          href="/admin/logbook"
          className="flex items-center gap-2.5 text-ink"
        >
          <LogoMark size={24} />
          <span className="text-card-title-sm">{title}</span>
        </Link>

        <nav aria-label="panel" className="hidden items-center gap-7 md:flex">
          {SECTIONS.map(({ label, href }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
          <LogoutButton className="text-action text-faded hover:text-ink" />
          <Link
            href="/admin/logbook/new"
            className="rounded-md border border-ink px-4 py-2.5 text-action text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            + nueva nota
          </Link>
        </nav>

        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none text-action text-leaf [&::-webkit-details-marker]:hidden">
            menú
          </summary>
          <nav
            aria-label="panel"
            className="absolute right-0 z-10 mt-3 flex w-48 flex-col gap-4 rounded-md border border-rule bg-paper p-4 shadow-lg"
          >
            {SECTIONS.map(({ label, href }) => (
              <Link key={href} href={href} className={linkClass}>
                {label}
              </Link>
            ))}
            <LogoutButton className="text-left text-action text-faded" />
          </nav>
        </details>
      </div>
    </header>
  );
}
