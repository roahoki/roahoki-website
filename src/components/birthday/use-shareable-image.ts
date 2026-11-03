"use client";

import { useEffect, useState } from "react";

/**
 * Compartir una imagen generada por la app, con descarga de respaldo.
 *
 * En el celular, compartir abre el menú del sistema con la imagen: desde ahí
 * se guarda en fotos o se manda directo por WhatsApp. Safari solo deja abrir
 * ese menú justo después del toque, así que la imagen se trae antes y el botón
 * comparte al instante. Donde no se puede compartir archivos (el computador),
 * se descarga.
 *
 * Con `src` en `null` no trae nada: la hoja que la usa está cerrada.
 */
export function useShareableImage(src: string | null, fileName: string) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFile(null);
    setError(null);
    if (!src) return;
    let cancelled = false;
    fetch(src, { cache: "no-store" })
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled)
          setFile(new File([blob], fileName, { type: "image/png" }));
      })
      .catch(() => {
        // Sin la imagen, compartir cae a la descarga directa.
      });
    return () => {
      cancelled = true;
    };
  }, [src, fileName]);

  function download() {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = fileName;
    link.click();
  }

  async function share() {
    if (!src) return;
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setError(
          "No se pudo abrir el menú de compartir; prueba con «descargar».",
        );
        return;
      }
    }
    download();
  }

  return { share, download, error };
}
