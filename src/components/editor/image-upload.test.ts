import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { editorExtensions } from "./extensions";
import {
  boundaryAtSelection,
  rejectReason,
  type UploadFn,
} from "./image-upload";

let editor: Editor | undefined;

/** Una subida que se resuelve a mano, para mirar el editor a mitad de camino. */
function deferredUpload() {
  const pending: {
    file: File;
    progress: (percent: number) => void;
    resolve: (url: string) => void;
    reject: (error: Error) => void;
  }[] = [];
  const upload: UploadFn = (file, progress) =>
    new Promise((resolve, reject) => {
      pending.push({ file, progress, resolve, reject });
    });
  return { upload, pending };
}

function setup(markdown: string, upload: UploadFn) {
  const onError = vi.fn();
  const onPendingChange = vi.fn();
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: editorExtensions({
      upload: { upload, onError, onPendingChange },
    }),
    content: markdown,
    contentType: "markdown",
  });
  return { editor, element, onError, onPendingChange };
}

function image(name: string, type = "image/jpeg", size = 1000) {
  return new File([new Uint8Array(size)], name, { type });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.innerHTML = "";
});

describe("subir imágenes al cuerpo", () => {
  it("muestra el avance donde va a quedar la imagen, fuera del markdown", async () => {
    const { upload, pending } = deferredUpload();
    const { editor, element } = setup("Primero.\n\nSegundo.", upload);

    editor.commands.setTextSelection(3);
    editor.commands.uploadImages([image("IMG_2041.jpg")]);
    await flush();
    pending[0].progress(60);

    expect(element.querySelector(".image-upload")?.textContent).toBe(
      "subiendo IMG_2041.jpg · 60 %",
    );
    // Guardar a mitad de la subida no deja basura en la nota.
    expect(editor.getMarkdown()).toBe("Primero.\n\nSegundo.");

    pending[0].resolve("https://cdn.test/a.jpg");
    await flush();

    expect(element.querySelector(".image-upload")).toBeNull();
    expect(editor.getMarkdown()).toBe(
      "Primero.\n\n![](https://cdn.test/a.jpg)\n\nSegundo.",
    );
  });

  it("el texto se puede seguir editando mientras sube", async () => {
    const { upload, pending } = deferredUpload();
    const { editor } = setup("Primero.\n\nSegundo.", upload);

    editor.commands.setTextSelection(3);
    editor.commands.uploadImages([image("a.jpg")]);
    await flush();
    // Escribir antes del aviso lo corre, pero no lo pierde.
    editor.commands.insertContentAt(1, "Muy ");
    pending[0].resolve("https://cdn.test/a.jpg");
    await flush();

    expect(editor.getMarkdown()).toBe(
      "Muy Primero.\n\n![](https://cdn.test/a.jpg)\n\nSegundo.",
    );
  });

  it("varias a la vez entran en el orden en que se soltaron", async () => {
    const { upload, pending } = deferredUpload();
    const { editor, element, onPendingChange } = setup("Texto.", upload);

    editor.commands.setTextSelection(4);
    editor.commands.uploadImages([image("1.jpg"), image("2.jpg")]);
    await flush();

    expect(
      [...element.querySelectorAll(".image-upload")].map(
        (el) => el.textContent,
      ),
    ).toEqual(["subiendo 1.jpg · 0 %", "esperando · 2.jpg"]);
    expect(onPendingChange).toHaveBeenLastCalledWith(2);

    pending[0].resolve("https://cdn.test/1.jpg");
    await flush();
    pending[1].resolve("https://cdn.test/2.jpg");
    await flush();

    // `trim`: con una imagen al final, Tiptap agrega un párrafo vacío detrás
    // para poder seguir escribiendo, y ese párrafo sale como una línea en
    // blanco.
    expect(editor.getMarkdown().trim()).toBe(
      "Texto.\n\n![](https://cdn.test/1.jpg)\n\n![](https://cdn.test/2.jpg)",
    );
    expect(onPendingChange).toHaveBeenLastCalledWith(0);
  });

  it("un archivo que no es imagen no se sube", async () => {
    const upload = vi.fn<UploadFn>();
    const { editor, onError } = setup("Texto.", upload);

    editor.commands.uploadImages([
      new File(["%PDF"], "cv.pdf", { type: "application/pdf" }),
    ]);
    await flush();

    expect(upload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("cv.pdf: solo imágenes.");
  });

  it("si la subida falla, el aviso se va y se explica por qué", async () => {
    const { upload, pending } = deferredUpload();
    const { editor, element, onError } = setup("Texto.", upload);

    editor.commands.uploadImages([image("a.jpg")]);
    await flush();
    pending[0].reject(new Error("no se pudo subir."));
    await flush();

    expect(element.querySelector(".image-upload")).toBeNull();
    expect(editor.getMarkdown()).toBe("Texto.");
    expect(onError).toHaveBeenCalledWith("a.jpg: no se pudo subir.");
  });

  it("pegar una imagen la sube; pegar texto con captura pega el texto", async () => {
    const { upload, pending } = deferredUpload();
    const { editor } = setup("Texto.", upload);
    const view = editor.view;

    function paste(files: File[], text: string) {
      const event = {
        clipboardData: {
          files,
          getData: (type: string) => (type === "text/plain" ? text : ""),
        },
        preventDefault: () => {},
      } as unknown as ClipboardEvent;
      return view.someProp("handlePaste", (handle) =>
        handle(view, event, view.state.selection.content()),
      );
    }

    // Word pone una imagen del texto copiado junto al texto.
    expect(
      paste([image("captura.png", "image/png")], "un párrafo"),
    ).toBeFalsy();
    expect(pending).toHaveLength(0);

    expect(paste([image("captura.png", "image/png")], "")).toBe(true);
    await flush();
    expect(pending[0].file.name).toBe("captura.png");
  });
});

describe("rejectReason", () => {
  it.each([
    [image("a.jpg"), null],
    [image("a.heic", "image/heic"), /Formato no admitido/],
    [image("grande.jpg", "image/jpeg", 5 * 1024 * 1024), /más de 4 MB/],
    [new File(["x"], "nota.txt", { type: "text/plain" }), /solo imágenes/],
  ])("%s", (file, expected) => {
    const reason = rejectReason(file);
    if (expected === null) expect(reason).toBeNull();
    else expect(reason).toMatch(expected);
  });
});

describe("boundaryAtSelection", () => {
  it("después del párrafo del cursor, o antes si está al comienzo", () => {
    const { editor } = setup("Uno.\n\nDos.", vi.fn<UploadFn>());

    editor.commands.setTextSelection(3);
    expect(boundaryAtSelection(editor.state)).toBe(6);

    editor.commands.setTextSelection(7);
    expect(boundaryAtSelection(editor.state)).toBe(6);
  });
});
