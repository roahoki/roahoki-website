import Image from "@tiptap/extension-image";
import type { NodeView } from "@tiptap/pm/view";
import {
  normalizeImageWidth,
  parseImageSrc,
  withImageWidth,
} from "@/lib/logbook/image-width";

/**
 * Imagen del cuerpo a la que se le cambia el tamaño arrastrando una esquina.
 *
 * El ancho es el atributo `width`, un porcentaje del ancho completo (`null` =
 * completo), y en el markdown viaja en el fragmento de la URL: ver
 * `src/lib/logbook/image-width.ts`.
 *
 * El `resize` que trae `@tiptap/extension-image` no sirve acá: guarda píxeles,
 * que en el celular no significan lo mismo, y no los escribe en el markdown,
 * así que se perderían al guardar.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // El ancho de una imagen pegada desde otra página viene en píxeles y no
      // se respeta: se lee solo del markdown.
      width: {
        default: null,
        parseHTML: () => null,
        renderHTML: ({ width }) =>
          width ? { style: `--image-width: ${width / 100}` } : {},
      },
      height: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
    };
  },

  parseMarkdown: (token, helpers) => {
    const { src, width } = parseImageSrc(token.href ?? "");
    return helpers.createNode("image", {
      src,
      width,
      title: token.title,
      alt: token.text,
    });
  },

  renderMarkdown: (node) => {
    const src = withImageWidth(
      node.attrs?.src ?? "",
      node.attrs?.width ?? null,
    );
    const alt = node.attrs?.alt ?? "";
    const title = node.attrs?.title ?? "";
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },

  addNodeView() {
    return ({ node, getPos, editor }) =>
      new ResizableImageView(node.attrs, (width) => {
        const pos = getPos();
        if (pos === undefined) return;
        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes("image", { width })
          .run();
      });
  },
});

type ImageAttrs = { src?: string; alt?: string | null; width?: number | null };

/**
 * El DOM de la imagen en el editor: un marco con el ancho de la imagen, y en
 * sus esquinas de abajo las manijas. Se ven al seleccionar la imagen (o al
 * pasar el mouse); en el celular, tocarla la selecciona.
 *
 * La imagen está centrada, así que mover una esquina cambia el ancho por los
 * dos lados: el desplazamiento cuenta doble.
 */
class ResizableImageView implements NodeView {
  dom: HTMLElement;
  private frame: HTMLElement;
  private img: HTMLImageElement;
  private label: HTMLElement;
  private width: number | null;

  constructor(
    attrs: ImageAttrs,
    private commit: (width: number | null) => void,
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "image-resizable";
    // Con un nodo propio, ProseMirror ya no la marca arrastrable: sin esto
    // la imagen no se podría mover de lugar dentro de la nota.
    this.dom.draggable = true;

    this.frame = document.createElement("div");
    this.frame.className = "image-frame";

    this.img = document.createElement("img");
    this.img.draggable = false;

    this.label = document.createElement("span");
    this.label.className = "image-width-label";
    this.label.setAttribute("aria-hidden", "true");

    this.frame.append(this.img, this.handle("left"), this.handle("right"));
    this.frame.append(this.label);
    this.dom.append(this.frame);

    this.width = attrs.width ?? null;
    this.render(attrs);
  }

  update(node: { type: { name: string }; attrs: ImageAttrs }): boolean {
    if (node.type.name !== "image") return false;
    this.width = node.attrs.width ?? null;
    this.render(node.attrs);
    return true;
  }

  selectNode() {
    this.dom.classList.add("is-selected");
  }

  deselectNode() {
    this.dom.classList.remove("is-selected");
  }

  // Lo que pasa en una manija es del arrastre, no de ProseMirror: si lo viera,
  // empezaría a mover la imagen de lugar.
  stopEvent(event: Event): boolean {
    return (
      event.target instanceof HTMLElement &&
      event.target.classList.contains("image-handle")
    );
  }

  // Los cambios de estilo durante el arrastre no son cambios del documento.
  ignoreMutation(): boolean {
    return true;
  }

  private render(attrs: ImageAttrs) {
    if (attrs.src && this.img.getAttribute("src") !== attrs.src) {
      this.img.src = attrs.src;
    }
    this.img.alt = attrs.alt ?? "";
    this.setWidth(this.width);
  }

  private setWidth(width: number | null) {
    if (width === null) this.frame.style.removeProperty("--image-width");
    else this.frame.style.setProperty("--image-width", String(width / 100));
    this.label.textContent = `${width ?? 100} %`;
  }

  private handle(side: "left" | "right"): HTMLElement {
    const handle = document.createElement("span");
    handle.className = `image-handle image-handle-${side}`;
    handle.draggable = false;
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("pointerdown", (event) =>
      this.startResize(event, side === "right" ? 1 : -1),
    );
    return handle;
  }

  private startResize(event: PointerEvent, direction: 1 | -1) {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    // El ancho completo sale de lo que mide el marco y el porcentaje que
    // representa: así no hay que repetir acá la cuenta del CSS.
    const startX = event.clientX;
    const startPx = this.frame.getBoundingClientRect().width;
    const fullPx = startPx / ((this.width ?? 100) / 100);
    let next = this.width;

    this.dom.classList.add("is-resizing");

    const move = (e: PointerEvent) => {
      const px = startPx + 2 * direction * (e.clientX - startX);
      next = normalizeImageWidth((px / fullPx) * 100);
      this.setWidth(next);
    };

    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      this.dom.classList.remove("is-resizing");
      if (next !== this.width) {
        this.width = next;
        this.commit(next);
      }
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }
}
