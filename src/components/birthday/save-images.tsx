"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { useShareableImage } from "./use-shareable-image";

/**
 * "guarda la info en tu galería :)" (Figma: invitado v3, para guardar): dos
 * miniaturas, la invitación y el cronograma, que abren una hoja con la imagen
 * en grande y "guardar en fotos".
 *
 * En el celular, "guardar en fotos" abre el menú de compartir con la imagen,
 * que es la única puerta a la galería desde una página web ("guardar imagen"
 * en iPhone). El detalle está en `use-shareable-image.ts`.
 */

type Item = {
  key: string;
  label: string;
  title: string;
  src: string;
  file: string;
  note: string;
};

export function SaveImages({ token }: { token: string }) {
  const items: Item[] = [
    {
      key: "invitacion",
      label: "invitación",
      title: "tu invitación",
      src: "/cumple/invitacion.png",
      file: "invitacion-25-joky.png",
      note: "En el celular se abre el menú de compartir: elige «guardar imagen». En el computador se descarga.",
    },
    {
      key: "cronograma",
      label: "cronograma",
      title: "tu cronograma",
      src: `/cumple/${token}/cronograma.png`,
      file: "cronograma-25-joky.png",
      note: "Trae todos tus planes. Roki asoma en los que dijiste voy, así que si cambias algo, vuelve a guardarlo.",
    },
  ];
  const [open, setOpen] = useState<Item | null>(null);

  return (
    <section aria-labelledby="para-guardar" className="flex flex-col gap-4">
      <h2 id="para-guardar" className="text-card-title">
        guarda la info en tu galería :)
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setOpen(item)}
            className="flex flex-col gap-2.5 text-left"
          >
            <span className="block aspect-[3/4] w-full overflow-hidden rounded-[14px] border-[1.5px] border-rule">
              {/* biome-ignore lint/performance/noImgElement: imágenes generadas por la propia app */}
              <img
                src={item.src}
                alt=""
                loading="lazy"
                className="w-full object-cover object-top"
              />
            </span>
            <span className="flex items-center justify-between">
              <span className="text-action">{item.label}</span>
              <span className="flex size-10 items-center justify-center rounded-full bg-ink text-paper">
                <Download className="size-5" aria-hidden />
              </span>
            </span>
          </button>
        ))}
      </div>
      <SaveSheet item={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function SaveSheet({
  item,
  onClose,
}: {
  item: Item | null;
  onClose: () => void;
}) {
  const { share, download, error } = useShareableImage(
    item?.src ?? null,
    item?.file ?? "",
  );

  return (
    <Dialog.Root
      open={item !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/55" />
        <Dialog.Content
          aria-describedby="guardar-nota"
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-[480px] flex-col items-center gap-4 overflow-y-auto rounded-t-[28px] bg-paper px-5 pt-3 pb-9"
        >
          <span className="h-[5px] w-10 rounded-full bg-rule" aria-hidden />
          <div className="flex w-full items-center justify-between">
            <Dialog.Title className="text-card-title">
              {item?.title}
            </Dialog.Title>
            <Dialog.Close aria-label="cerrar">
              <X className="size-6" aria-hidden />
            </Dialog.Close>
          </div>
          {item && (
            // biome-ignore lint/performance/noImgElement: imagen generada por la propia app
            <img
              src={item.src}
              alt={item.title}
              className="w-[60%] rounded-[14px] border-[1.5px] border-rule"
            />
          )}
          <button
            type="button"
            onClick={share}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-ink text-action text-paper"
          >
            <Download className="size-5" aria-hidden />
            guardar en fotos
          </button>
          <button
            type="button"
            onClick={download}
            className="flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-ink text-action"
          >
            descargar
          </button>
          <p id="guardar-nota" className="w-full text-entry-meta text-faded">
            {item?.note}
          </p>
          {error && (
            <p role="alert" className="w-full text-entry-meta text-leaf">
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
