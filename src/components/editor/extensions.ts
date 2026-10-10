import type { Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Italic from "@tiptap/extension-italic";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { safeUrl } from "@/lib/markdown";
import { ImageUpload, type ImageUploadOptions } from "./image-upload";

/**
 * Itálica que se conserva pero no se crea.
 *
 * La marca no tiene itálica (brand book §5.4), así que no hay atajo (Ctrl I)
 * ni regla de escritura (`*así*`) para producirla. Pero hay notas viejas que la
 * usan, y sin la extensión el editor no la entendería: abrir una de esas notas
 * y guardarla borraría el énfasis. La página pública la muestra en negrita.
 */
const ItalicWithoutShortcut = Italic.extend({
  addKeyboardShortcuts: () => ({}),
  addInputRules: () => [],
  addPasteRules: () => [],
});

/**
 * Las extensiones del editor del logbook. Viven aparte del componente para que
 * los tests puedan armar el mismo editor sin React.
 *
 * El cuerpo se sigue guardando como markdown (`@tiptap/markdown`): la base, la
 * página pública y el feed no se enteran de que el editor cambió.
 *
 * Atajos que traen las extensiones: Ctrl B negrita, Ctrl Alt 1/2/3 títulos,
 * Ctrl Alt 0 texto normal, y `## ` al empezar la línea. Los del editor
 * (guardar, publicar, link) los maneja el componente.
 *
 * Las imágenes se arrastran desde el escritorio o se pegan: ver
 * `image-upload.ts`.
 */
export function editorExtensions({
  placeholder = "",
  upload = {},
}: {
  placeholder?: string;
  /** Cómo subir las imágenes que se arrastran o se pegan. */
  upload?: Partial<ImageUploadOptions>;
} = {}): Extensions {
  return [
    StarterKit.configure({
      // Hasta el 3: hay notas con `#`, y limitarlos lo convertiría en párrafo
      // al guardar.
      heading: { levels: [1, 2, 3] },
      italic: false,
      // Markdown no tiene subrayado: lo que se subrayara se perdería al guardar.
      underline: false,
      // La línea al mover algo dentro del editor. Al arrastrar un archivo la
      // reemplaza la de `ImageUpload`, que cae entre bloques (ver CSS).
      dropcursor: { class: "drop-cursor", color: false, width: 3 },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        // La misma allowlist que el render público: lo que no se va a poder
        // mostrar, tampoco se guarda.
        isAllowedUri: (url) => safeUrl(url) !== "",
      },
    }),
    ItalicWithoutShortcut,
    Image,
    ImageUpload.configure(upload),
    Markdown,
    Placeholder.configure({ placeholder }),
  ];
}

/** Palabras del cuerpo, para el contador de la barra. */
export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}
