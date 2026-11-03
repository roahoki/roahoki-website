"use client";

import { Download, Share2 } from "lucide-react";
import { useShareableImage } from "../use-shareable-image";

export const COCKTAIL_PHOTO_SRC = "/cumple/coctel.png";

/**
 * La foto del cóctel para el grupo de WhatsApp de la familia, que no tiene
 * link personal. En el celular, «compartir» abre el menú del sistema: de ahí
 * va directo al grupo o se guarda en fotos.
 */
export function CocktailPhoto() {
  const { share, download, error } = useShareableImage(
    COCKTAIL_PHOTO_SRC,
    "coctel-joky.png",
  );

  return (
    <div className="flex flex-col gap-3">
      {/* biome-ignore lint/performance/noImgElement: imagen generada por la propia app */}
      <img
        src={COCKTAIL_PHOTO_SRC}
        alt="La invitación al cóctel: fecha, hora, en mi casa y vestimenta formal."
        className="w-[60%] max-w-[280px] rounded-[14px]"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-action text-paper"
        >
          <Share2 className="size-[18px]" aria-hidden />
          compartir
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-3.5 text-action"
        >
          <Download className="size-[18px]" aria-hidden />
          descargar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-card-meta text-leaf">
          {error}
        </p>
      )}
    </div>
  );
}
