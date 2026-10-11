import Link from "next/link";
import { AnimatedLogo } from "@/components/brand/animated-logo";

/**
 * Header del sitio con la marca nueva (brand book §7.4): solo el logo.
 *
 * No lleva "escríbeme": casi todos leen desde una historia, en el navegador
 * interno de Instagram, donde ningún link a Instagram abre el chat. Cerrar la
 * página ya los deja a un toque de responder.
 *
 * El logo se dibuja al cargar (`AnimatedLogo`). El header sigue siendo un
 * Server Component: solo el logo baja al cliente.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="flex px-4 py-5 md:px-8 md:py-7">
        <Link href="/" className="text-ink">
          <AnimatedLogo size={20} />
        </Link>
      </div>
    </header>
  );
}
