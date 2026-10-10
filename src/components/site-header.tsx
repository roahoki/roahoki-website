import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { InstagramDmLink } from "@/components/instagram-dm-link";

/**
 * Header del sitio con la marca nueva (brand book §7.4): el logo y
 * "escríbeme", nada más.
 *
 * `items-baseline` alinea la palabra "roahoki" con "escríbeme" por la línea
 * base del texto, aunque tengan tamaños distintos. Con `items-center` se
 * alinearían las cajas, y la figura —más alta que la palabra— corre el texto
 * del logo hacia abajo.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="flex items-baseline justify-between gap-6 px-4 py-5 md:px-8 md:py-7">
        <Link href="/" className="text-ink">
          <Logo size={20} />
        </Link>
        <InstagramDmLink className="text-action text-leaf underline-offset-4 hover:underline focus-visible:underline">
          escríbeme
        </InstagramDmLink>
      </div>
    </header>
  );
}
