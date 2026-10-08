import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { INSTAGRAM_DM_URL } from "@/lib/profile";

/**
 * Header del sitio con la marca nueva (brand book §7.4).
 *
 * Logo, la bajada y "escríbeme". En móvil la bajada no va: a 390 px no entra
 * en la misma línea, y una segunda línea en el header empuja el contenido.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="flex items-center justify-between gap-6 px-4 py-5 md:px-8 md:py-7">
        <div className="flex items-baseline gap-4">
          {/* TODO: apuntar a `/` cuando el logbook pase a ser el home (PR 5
              del rediseño). Hoy `/` es la landing anterior. */}
          <Link href="/logbook" className="text-ink">
            <Logo height={22} className="block" />
          </Link>
          <p className="hidden text-lead text-faded md:block">
            compartir aprendizaje, based en santiago
          </p>
        </div>
        <a
          href={INSTAGRAM_DM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-action text-leaf underline-offset-4 hover:underline focus-visible:underline"
        >
          escríbeme
        </a>
      </div>
    </header>
  );
}
