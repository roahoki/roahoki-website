import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { editorExtensions } from "./extensions";

const URL =
  "https://x.supabase.co/storage/v1/object/public/logbook-images/a.jpg";

let editor: Editor | undefined;

function open(markdown: string): Editor {
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: editorExtensions(),
    content: markdown,
    contentType: "markdown",
  });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.innerHTML = "";
});

describe("ancho en el markdown", () => {
  it("conserva el ancho al abrir y guardar", () => {
    expect(open(`![](${URL}#w=60)`).getMarkdown().trim()).toBe(
      `![](${URL}#w=60)`,
    );
  });

  it("lo lee como atributo, no como parte de la URL", () => {
    const image = open(`![](${URL}#w=60)`).state.doc.firstChild;
    expect(image?.attrs).toMatchObject({ src: URL, width: 60 });
  });

  it("una imagen sin ancho se guarda como antes", () => {
    expect(open(`![](${URL})`).getMarkdown().trim()).toBe(`![](${URL})`);
  });

  it("cambiar el ancho lo escribe en la URL", () => {
    const current = open(`![](${URL})`);
    current
      .chain()
      .setNodeSelection(0)
      .updateAttributes("image", { width: 45 })
      .run();
    expect(current.getMarkdown().trim()).toBe(`![](${URL}#w=45)`);
  });

  // Una imagen pegada desde otra página trae su ancho en píxeles: tomarlo
  // como porcentaje la dejaría de cualquier tamaño.
  it("ignora el width en píxeles del HTML pegado", () => {
    const current = open("");
    current.commands.setContent(`<img src="${URL}" width="1200">`);
    expect(current.getMarkdown().trim()).toBe(`![](${URL})`);
  });
});

describe("mover la imagen", () => {
  // Con un nodo propio ProseMirror no la marca arrastrable sola; sin esto no
  // se podría mover de lugar dentro de la nota.
  it("la imagen se puede arrastrar y las manijas no", () => {
    const dom = open(`![](${URL})`).view.dom;
    expect(dom.querySelector<HTMLElement>(".image-resizable")?.draggable).toBe(
      true,
    );
    expect(dom.querySelector<HTMLElement>(".image-handle")?.draggable).toBe(
      false,
    );
  });
});

describe("arrastrar una esquina", () => {
  function frameOf(current: Editor, widthPx: number) {
    const frame = current.view.dom.querySelector<HTMLElement>(".image-frame");
    if (!frame) throw new Error("sin marco");
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      width: widthPx,
    } as DOMRect);
    return frame;
  }

  function drag(handle: HTMLElement, from: number, to: number) {
    // happy-dom no implementa la captura del puntero; acá no hace falta.
    handle.setPointerCapture = () => {};
    handle.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: from, pointerId: 1 }),
    );
    handle.dispatchEvent(
      new PointerEvent("pointermove", { clientX: to, pointerId: 1 }),
    );
    handle.dispatchEvent(
      new PointerEvent("pointerup", { clientX: to, pointerId: 1 }),
    );
  }

  // La imagen va centrada: 200 px hacia adentro en una esquina son 400 px
  // menos de ancho, la mitad de 800.
  it("la esquina derecha hacia adentro la achica por los dos lados", () => {
    const current = open(`![](${URL})`);
    const frame = frameOf(current, 800);
    drag(frame.querySelector(".image-handle-right") as HTMLElement, 700, 500);

    expect(current.getMarkdown().trim()).toBe(`![](${URL}#w=50)`);
  });

  it("la esquina izquierda va al revés", () => {
    const current = open(`![](${URL}#w=50)`);
    // Al 50 %, 400 px de un ancho completo de 800.
    const frame = frameOf(current, 400);
    drag(frame.querySelector(".image-handle-left") as HTMLElement, 200, 100);

    expect(current.getMarkdown().trim()).toBe(`![](${URL}#w=75)`);
  });

  it("estirarla hasta el borde la vuelve a ancho completo", () => {
    const current = open(`![](${URL}#w=50)`);
    const frame = frameOf(current, 400);
    drag(frame.querySelector(".image-handle-right") as HTMLElement, 600, 900);

    expect(current.getMarkdown().trim()).toBe(`![](${URL})`);
  });
});
