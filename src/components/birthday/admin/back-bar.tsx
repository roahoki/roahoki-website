import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** La barra de las pantallas internas del panel: volver, y nada más. */
export function BackBar({ href, label }: { href: string; label: string }) {
  return (
    <header className="border-b border-rule">
      <Link
        href={href}
        className="flex items-center gap-1.5 px-4 py-4 text-action text-ink md:px-8"
      >
        <ArrowLeft className="size-5" aria-hidden />
        {label}
      </Link>
    </header>
  );
}
