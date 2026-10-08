"use client";

import { useState } from "react";

/**
 * Copia la URL de la entrada. Existe porque la entrada se comparte en
 * Instagram (brand book §2): pegar el link en una historia tiene que ser un
 * toque, no seleccionar la barra de direcciones en el celular.
 *
 * Es el único componente de cliente de la página: el resto es HTML del
 * servidor.
 */
export function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      // Sin permiso de portapapeles (o en un navegador viejo) se avisa en vez
      // de fingir que funcionó.
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  const label = {
    idle: "copiar link",
    copied: "copiado",
    failed: "no se pudo copiar",
  }[state];

  return (
    <button
      type="button"
      onClick={copy}
      className="h-11 rounded-md border border-ink px-[18px] text-action text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      {/* `aria-live` para que un lector de pantalla anuncie el cambio. */}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
