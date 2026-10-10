import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { uploadImageSchema } from "@/lib/schemas/logbook";
import { extensionOf } from "@/lib/storage";

/**
 * Arrastrar, soltar y pegar imágenes en el cuerpo de la nota.
 *
 * Mientras una imagen sube, en su lugar se ve "subiendo IMG_2041.jpg · 60 %".
 * Ese aviso es una decoración y no un nodo: no es parte del documento, así que
 * nunca llega al markdown aunque se guarde a mitad de la subida, y el texto de
 * alrededor se puede seguir editando. Al terminar, la imagen se inserta donde
 * quedó el aviso.
 *
 * Las imágenes se insertan siempre entre bloques, nunca en medio de un
 * párrafo: en el markdown una imagen va en su propia línea.
 */

export type UploadFn = (
  file: File,
  onProgress: (percent: number) => void,
) => Promise<string>;

export type ImageUploadOptions = {
  /** Sube el archivo y devuelve su URL pública. */
  upload: UploadFn;
  /** Un archivo que no se pudo subir, con el motivo para mostrar. */
  onError: (message: string) => void;
  /** Cuántas imágenes quedan por subir, para la barra de estado. */
  onPendingChange: (pending: number) => void;
};

// `batch` agrupa las imágenes que se soltaron juntas, para mantener su orden.
type Upload = { id: string; batch: string; label: string; side: number };

type PluginState = {
  uploads: DecorationSet;
  // Dónde caería lo que se está arrastrando; `null` si no se arrastra nada.
  dropAt: number | null;
};

type Action =
  | { type: "add"; pos: number; uploads: Upload[] }
  | { type: "label"; id: string; label: string }
  | { type: "remove"; id: string }
  // La imagen de `id` entró: su aviso se va y los que esperan con ella pasan
  // a `at`, justo detrás.
  | { type: "placed"; id: string; at: number }
  | { type: "drop"; pos: number | null };

export const imageUploadKey = new PluginKey<PluginState>("imageUpload");

export const DROP_HINT = "soltá para insertar acá";

function uploadWidget(pos: number, upload: Upload): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const el = document.createElement("div");
      el.className = "image-upload";
      el.setAttribute("contenteditable", "false");
      el.textContent = upload.label;
      return el;
    },
    // `side` negativo: si algo se inserta justo en esta posición, el aviso
    // queda antes. Importa al final de la nota, donde Tiptap agrega un
    // párrafo vacío detrás de una imagen: sin esto, los avisos que esperan
    // quedarían después de ese párrafo.
    { ...upload, key: `${upload.id}:${upload.label}`, ignoreSelection: true },
  );
}

function dropWidget(pos: number): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const el = document.createElement("div");
      el.className = "file-drop-indicator";
      el.setAttribute("contenteditable", "false");
      el.textContent = DROP_HINT;
      return el;
    },
    { side: -1000, key: `drop:${pos}`, ignoreSelection: true },
  );
}

function findUpload(state: EditorState, id: string): Decoration | undefined {
  const set = imageUploadKey.getState(state)?.uploads;
  return set?.find(undefined, undefined, (spec) => spec.id === id)[0];
}

/**
 * La posición entre bloques más cercana: antes o después del bloque de primer
 * nivel donde cae `pos`.
 */
export function blockBoundary(
  doc: PMNode,
  pos: number,
  prefer: "before" | "after",
): number {
  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
  if ($pos.depth === 0) return $pos.pos;
  return prefer === "before" ? $pos.before(1) : $pos.after(1);
}

/** Dónde insertar lo que se pega o se elige con el botón: junto al cursor. */
export function boundaryAtSelection(state: EditorState): number {
  const { $from } = state.selection;
  if ($from.depth === 0) return $from.pos;
  // Con el cursor al principio de un párrafo con texto, la imagen va antes:
  // es lo que se espera al pegar en el comienzo de una línea.
  const atStart = $from.pos === $from.start(1) && $from.node(1).content.size;
  return blockBoundary(state.doc, $from.pos, atStart ? "before" : "after");
}

/** Dónde caería un archivo soltado en estas coordenadas. */
function boundaryAtCoords(view: EditorView, event: DragEvent): number | null {
  const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!hit) return null;

  const { doc } = view.state;
  const $pos = doc.resolve(hit.pos);
  if ($pos.depth === 0) return hit.pos;

  // Arriba o abajo según en qué mitad del bloque esté el puntero.
  const dom = view.nodeDOM($pos.before(1));
  if (dom instanceof HTMLElement) {
    const rect = dom.getBoundingClientRect();
    const upper = event.clientY < rect.top + rect.height / 2;
    return blockBoundary(doc, hit.pos, upper ? "before" : "after");
  }
  return blockBoundary(doc, hit.pos, "after");
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Por qué no se puede subir un archivo, o `null` si se puede.
 *
 * Es una cortesía para no esperar una subida que va a fallar: la regla la
 * aplica el route handler con el mismo esquema.
 */
export function rejectReason(file: File): string | null {
  if (!file.type.startsWith("image/")) return `${file.name}: solo imágenes.`;
  const parsed = uploadImageSchema.safeParse({
    extension: extensionOf(file.name) ?? "",
    size: file.size,
  });
  return parsed.success
    ? null
    : `${file.name}: ${parsed.error.issues[0]?.message ?? "no se pudo subir."}`;
}

let nextId = 0;

export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: "imageUpload",

  addOptions() {
    return {
      upload: () => Promise.reject(new Error("Sin función de subida.")),
      onError: () => {},
      onPendingChange: () => {},
    };
  },

  addCommands() {
    return {
      uploadImages:
        (files: File[], pos?: number) =>
        ({ editor, dispatch }) => {
          // `can()` pregunta sin ejecutar: ahí `dispatch` no viene.
          if (!dispatch) return true;
          const at = pos ?? boundaryAtSelection(editor.state);
          // Fuera de la cadena de comandos: las subidas despachan sus propias
          // transacciones, y en medio de una cadena se cruzarían con la suya.
          queueMicrotask(() =>
            startUploads(editor.view, files, at, this.options),
          );
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<PluginState>({
        key: imageUploadKey,
        state: {
          init: () => ({ uploads: DecorationSet.empty, dropAt: null }),
          apply(tr, value) {
            let uploads = value.uploads.map(tr.mapping, tr.doc);
            let dropAt =
              value.dropAt === null ? null : tr.mapping.map(value.dropAt);
            const action = tr.getMeta(imageUploadKey) as Action | undefined;

            if (action?.type === "add") {
              uploads = uploads.add(
                tr.doc,
                action.uploads.map((upload) =>
                  uploadWidget(action.pos, upload),
                ),
              );
            } else if (action?.type === "label" || action?.type === "remove") {
              const found = uploads.find(
                undefined,
                undefined,
                (spec) => spec.id === action.id,
              );
              uploads = uploads.remove(found);
              if (action.type === "label" && found[0]) {
                const spec = found[0].spec as Upload;
                uploads = uploads.add(tr.doc, [
                  uploadWidget(found[0].from, { ...spec, label: action.label }),
                ]);
              }
            } else if (action?.type === "placed") {
              const [done] = uploads.find(
                undefined,
                undefined,
                (spec) => spec.id === action.id,
              );
              const waiting = done
                ? uploads.find(
                    undefined,
                    undefined,
                    (spec) =>
                      spec.batch === done.spec.batch && spec.id !== action.id,
                  )
                : [];
              uploads = uploads.remove(done ? [done, ...waiting] : []).add(
                tr.doc,
                waiting.map((deco) =>
                  uploadWidget(action.at, deco.spec as Upload),
                ),
              );
            } else if (action?.type === "drop") {
              dropAt = action.pos;
            }

            return { uploads, dropAt };
          },
        },
        props: {
          decorations(state) {
            const value = imageUploadKey.getState(state);
            if (!value) return null;
            return value.dropAt === null
              ? value.uploads
              : value.uploads.add(state.doc, [dropWidget(value.dropAt)]);
          },
          handleDOMEvents: {
            dragover(view, event) {
              if (!hasFiles(event)) return false;
              const pos = boundaryAtCoords(view, event);
              if (pos !== imageUploadKey.getState(view.state)?.dropAt) {
                setDropAt(view, pos);
              }
              return false;
            },
            dragleave(view, event) {
              // `dragleave` también salta al pasar de un hijo a otro dentro
              // del editor; solo cuenta cuando el puntero sale de verdad.
              const to = event.relatedTarget;
              if (!(to instanceof Node && view.dom.contains(to))) {
                setDropAt(view, null);
              }
              return false;
            },
          },
          handleDrop(view, event, _slice, moved) {
            const hinted = imageUploadKey.getState(view.state)?.dropAt ?? null;
            setDropAt(view, null);
            // Mover algo que ya está en el editor lo resuelve Tiptap.
            if (moved) return false;

            const files = Array.from(event.dataTransfer?.files ?? []);
            if (files.length === 0) return false;

            event.preventDefault();
            const pos =
              hinted ??
              boundaryAtCoords(view, event) ??
              view.state.doc.content.size;
            startUploads(view, files, pos, options);
            return true;
          },
          handlePaste(view, event) {
            const data = event.clipboardData;
            const files = Array.from(data?.files ?? []);
            // Word y otras apps ponen una captura del texto copiado además del
            // texto. Si viene texto, se pega el texto.
            if (files.length === 0 || data?.getData("text/plain")) return false;

            event.preventDefault();
            startUploads(view, files, boundaryAtSelection(view.state), options);
            return true;
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageUpload: {
      /**
       * Sube imágenes y las inserta, en orden, entre los bloques junto a
       * `pos` o al cursor.
       */
      uploadImages: (files: File[], pos?: number) => ReturnType;
    };
  }
}

function setDropAt(view: EditorView, pos: number | null) {
  view.dispatch(
    view.state.tr.setMeta(imageUploadKey, { type: "drop", pos } as Action),
  );
}

function dispatchAction(view: EditorView, action: Action) {
  if (view.isDestroyed) return;
  view.dispatch(view.state.tr.setMeta(imageUploadKey, action));
}

// Subidas en curso por editor. Por editor y no un número global: el panel
// podría tener más de un editor montado, y los tests montan varios.
const pendingByView = new WeakMap<EditorView, number>();

function changePending(
  view: EditorView,
  delta: number,
  options: ImageUploadOptions,
) {
  const count = (pendingByView.get(view) ?? 0) + delta;
  pendingByView.set(view, count);
  options.onPendingChange(count);
}

/**
 * Valida, pone un aviso por imagen y las sube de a una.
 *
 * De a una y no en paralelo: así entran en el orden en que se soltaron y
 * ninguna compite por el ancho de banda del celular con las demás.
 */
async function startUploads(
  view: EditorView,
  files: File[],
  pos: number,
  options: ImageUploadOptions,
) {
  const batch = `batch-${nextId++}`;
  const valid = files.filter((file) => {
    const reason = rejectReason(file);
    if (reason) options.onError(reason);
    return reason === null;
  });
  // El primero con el `side` más bajo: es el que se dibuja primero.
  const accepted = valid.map((file, index) => ({
    file,
    upload: {
      id: `upload-${nextId++}`,
      batch,
      label: `esperando · ${file.name}`,
      side: index - valid.length,
    },
  }));
  if (accepted.length === 0) return;
  dispatchAction(view, {
    type: "add",
    pos,
    uploads: accepted.map(({ upload }) => upload),
  });
  changePending(view, accepted.length, options);

  for (const { file, upload } of accepted) {
    const label = (percent: number) =>
      `subiendo ${file.name} · ${Math.round(percent)} %`;
    dispatchAction(view, { type: "label", id: upload.id, label: label(0) });

    try {
      let shown = 0;
      const url = await options.upload(file, (percent) => {
        // Un aviso por cada punto de avance, no por cada evento del navegador.
        if (Math.round(percent) === shown) return;
        shown = Math.round(percent);
        dispatchAction(view, {
          type: "label",
          id: upload.id,
          label: label(percent),
        });
      });
      insertImage(view, upload.id, url);
    } catch (error) {
      dispatchAction(view, { type: "remove", id: upload.id });
      options.onError(
        `${file.name}: ${error instanceof Error ? error.message : "no se pudo subir."}`,
      );
    } finally {
      changePending(view, -1, options);
    }
  }
}

function insertImage(view: EditorView, id: string, src: string) {
  if (view.isDestroyed) return;
  const { state } = view;
  const image = state.schema.nodes.image;
  const found = findUpload(state, id);
  // Si se borró el texto que rodeaba el aviso, la imagen va al final: ya está
  // subida y perderla obligaría a subirla de nuevo.
  const target = found ? found.from : state.doc.content.size;
  // Una edición pudo dejar la posición dentro de un párrafo (por ejemplo, al
  // unir dos con Backspace): se corre al borde del bloque.
  const pos = blockBoundary(state.doc, target, "after");
  const node = image.create({ src, alt: "" });

  view.dispatch(
    state.tr.insert(pos, node).setMeta(imageUploadKey, {
      type: "placed",
      id,
      at: pos + node.nodeSize,
    } as Action),
  );
}
