"use client";

import { useEffect } from "react";

/**
 * Anota en el panel que el invitado abrió su link.
 *
 * Desde el navegador y no al renderizar en el servidor: cuando el link se pega
 * en WhatsApp, su servidor descarga la página para armar la vista previa, y eso
 * contaría como "abrió" sin que nadie la haya visto. El robot no corre
 * JavaScript; una persona sí.
 */
export function VisitBeacon({ token }: { token: string }) {
  useEffect(() => {
    fetch("/api/birthday/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => {
      // Si falla, el panel muestra "no ha abierto": no vale la pena molestar
      // al invitado por eso.
    });
  }, [token]);
  return null;
}
