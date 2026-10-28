"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copia un texto al portapapeles y avisa en el mismo botón. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles (algunos navegadores internos): se
      // selecciona a mano. No hay mucho más que hacer desde acá.
      window.prompt("Copia esto:", text);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink px-4 text-action text-ink"
    >
      {copied ? (
        <Check className="size-[18px]" aria-hidden />
      ) : (
        <Copy className="size-[18px]" aria-hidden />
      )}
      {copied ? "copiado" : label}
    </button>
  );
}
