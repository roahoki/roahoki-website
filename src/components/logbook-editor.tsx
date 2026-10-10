"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { LogbookEntry } from "@/db/schema";
import { formatTagsInput, parseTagsInput } from "@/lib/logbook/editor";
import { ENTRY_FORMAT_LABELS } from "@/lib/logbook/entry-format";
import { formatEntryDateShort } from "@/lib/logbook/format";
import { countWords, editorExtensions } from "./editor/extensions";
import { uploadImage } from "./editor/upload-image";

/**
 * Editor de una nota, para crear y para editar (brand book §7.4, admin).
 *
 * "Escribir primero": la nota se ve como va a quedar publicada —título grande,
 * cuerpo a 68ch con los estilos de la entrada— y no como un formulario. El
 * cuerpo es un editor visual (Tiptap) que guarda markdown, así que la base y
 * la página pública no cambian.
 *
 * Las imágenes se arrastran desde el escritorio, se pegan o se eligen con
 * "foto"; suben mientras se sigue escribiendo (`editor/image-upload.ts`).
 *
 * Mobile-first: en el celular la barra de acciones queda fija abajo; en
 * escritorio va arriba, con el contador de palabras.
 */

type Props = {
  /** Si viene, se está editando; si no, creando. */
  entry?: LogbookEntry;
};

type Status = "draft" | "published";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const SHORTCUTS = [
  ["negrita", "Ctrl B"],
  ["link", "Ctrl K"],
  ["título", "Ctrl Alt 1"],
  ["subtítulo", "Ctrl Alt 2 · o ## y espacio"],
  ["subtítulo menor", "Ctrl Alt 3 · o ### y espacio"],
  ["volver a texto normal", "Ctrl Alt 0"],
  ["guardar", "Ctrl S"],
  ["publicar", "Ctrl Enter"],
  ["esta lista", "Ctrl /"],
] as const;

export function LogbookEditor({ entry }: Props) {
  const router = useRouter();
  // Una nota nueva pasa a "existente" con su primer guardado: desde ahí se
  // actualiza en vez de crear otra.
  const [saved, setSaved] = useState(entry);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [summary, setSummary] = useState(entry?.summary ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    entry?.coverImageUrl ?? "",
  );
  const [tagsInput, setTagsInput] = useState(
    formatTagsInput(entry?.tags ?? []),
  );
  // Una nota nueva nace borrador: se publica a propósito, con "publicar".
  const [status, setStatus] = useState<Status>(entry?.status ?? "draft");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showData, setShowData] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Imágenes que todavía están subiendo. Mientras haya, no se publica: la
  // nota saldría sin ellas.
  const [uploading, setUploading] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: editorExtensions({
      placeholder: "escribe acá…",
      upload: {
        upload: uploadImage,
        onError: setErrorMsg,
        onPendingChange: setUploading,
      },
    }),
    content: entry?.bodyMd ?? "",
    contentType: "markdown",
    // Next renderiza en el servidor; el editor necesita el DOM.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-entry min-h-[40vh] focus:outline-none",
        "aria-label": "cuerpo de la nota",
      },
    },
    onUpdate: () => setSaveState("dirty"),
  });

  const words =
    useEditorState({
      editor,
      selector: ({ editor: current }) => countWords(current?.getText() ?? ""),
    }) ?? 0;

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setSaveState("dirty");
    };
  }

  // El título crece con el texto en vez de mostrar una barra de scroll.
  // biome-ignore lint/correctness/useExhaustiveDependencies: depende del texto a propósito
  useEffect(() => {
    const field = titleRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [title]);

  /**
   * Guarda con el estado pedido. `leave` vuelve a la lista: es lo que pasa al
   * publicar con el botón; Ctrl S guarda y deja seguir escribiendo.
   */
  async function save(nextStatus: Status, { leave }: { leave: boolean }) {
    if (!editor || saveState === "saving") return;
    // Guardar sin salir sí se puede: el aviso de "subiendo" no es parte del
    // cuerpo y la imagen entra cuando termina.
    if (leave && uploading > 0) {
      setErrorMsg("Espera a que terminen de subir las imágenes.");
      return;
    }
    setSaveState("saving");
    setErrorMsg("");

    const payload = {
      title,
      summary: summary || null,
      bodyMd: editor.getMarkdown(),
      coverImageUrl: coverImageUrl || null,
      tags: parseTagsInput(tagsInput),
      status: nextStatus,
      // Al crear, un slug vacío hace que el servidor lo derive del título.
      ...(slug ? { slug } : {}),
    };

    const res = await fetch(
      saved ? `/api/admin/logbook/${saved.id}` : "/api/admin/logbook",
      {
        method: saved ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error ?? "No se pudo guardar.");
      setSaveState("error");
      return;
    }

    setStatus(nextStatus);
    if (leave) {
      router.push("/admin/logbook");
      router.refresh();
      return;
    }

    const stored: LogbookEntry = data.entry;
    if (!saved) {
      // La URL pasa a ser la de la nota sin recargar la página: recargarla
      // movería el cursor y el scroll de quien está escribiendo.
      window.history.replaceState(null, "", `/admin/logbook/${stored.id}`);
    }
    setSaved(stored);
    setSlug(stored.slug);
    setSaveState("saved");
  }

  async function remove() {
    if (!saved) return;
    if (!confirm("¿Eliminar esta nota? No se puede deshacer.")) return;

    const res = await fetch(`/api/admin/logbook/${saved.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setErrorMsg("No se pudo eliminar.");
      setSaveState("error");
      return;
    }

    router.push("/admin/logbook");
    router.refresh();
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar
    // el evento.
    e.target.value = "";
    if (files.length === 0 || !editor) return;

    setErrorMsg("");
    editor.chain().focus().uploadImages(files).run();
  }

  function promptLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href ?? "";
    const url = window.prompt("link", previous);
    if (url === null) return;

    const chain = editor.chain().focus().extendMarkRange("link");
    if (url.trim() === "") chain.unsetLink().run();
    else chain.setLink({ href: url.trim() }).run();
  }

  // Los atajos del editor que no son de formato. Se lee la versión más nueva
  // de cada función por ref, para registrar el listener una sola vez.
  const actions = useRef({ save, promptLink, status });
  actions.current = { save, promptLink, status };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowShortcuts(false);
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

      const {
        save: doSave,
        promptLink: doLink,
        status: current,
      } = actions.current;
      const key = e.key.toLowerCase();

      if (key === "s") {
        e.preventDefault();
        doSave(current, { leave: false });
      } else if (key === "enter") {
        e.preventDefault();
        doSave("published", { leave: true });
      } else if (key === "k") {
        e.preventDefault();
        doLink();
      } else if (key === "/") {
        e.preventDefault();
        setShowShortcuts((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const busy = saveState === "saving" || uploading > 0;
  const primaryLabel = status === "published" ? "guardar" : "publicar";
  const statusText =
    uploading > 0
      ? `subiendo ${uploading === 1 ? "imagen" : `${uploading} imágenes`}…`
      : describeState(saveState, status, saved !== undefined);

  const primaryButton = (
    <button
      type="button"
      onClick={() => save("published", { leave: true })}
      disabled={busy}
      className="h-11 rounded-md border border-ink px-5 text-action text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {primaryLabel}
    </button>
  );

  const secondaryClass =
    "text-action text-leaf underline-offset-4 hover:underline disabled:opacity-50";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-rule bg-paper">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-baseline gap-5">
            <Link href="/admin/logbook" className={secondaryClass}>
              ← notas
            </Link>
            <span className="text-card-meta text-faded" aria-live="polite">
              {statusText}
            </span>
          </div>
          <div className="hidden items-center gap-7 md:flex">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="text-card-meta text-faded hover:text-ink"
            >
              {words} palabras · Ctrl / atajos
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={secondaryClass}
            >
              foto
            </button>
            <button
              type="button"
              onClick={() => setShowData((open) => !open)}
              aria-expanded={showData}
              aria-controls="datos"
              className={secondaryClass}
            >
              datos
            </button>
            {primaryButton}
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        aria-label="foto"
        onChange={handleImagePick}
        className="hidden"
      />

      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-4 pt-7 pb-32 md:px-0 md:pt-14 md:pb-20">
        <p className="flex flex-wrap gap-x-3 text-entry-meta text-faded">
          <span>{saved ? `#${saved.number}` : "nueva"}</span>
          <span>
            {saved && status === "published"
              ? formatEntryDateShort(saved.publishedAt)
              : "sin publicar"}
          </span>
          {saved?.format && <span>{ENTRY_FORMAT_LABELS[saved.format]}</span>}
        </p>

        <label htmlFor="entry-title" className="sr-only">
          título
        </label>
        <textarea
          id="entry-title"
          ref={titleRef}
          rows={1}
          value={title}
          onChange={(e) => markDirty(setTitle)(e.target.value)}
          placeholder="título"
          className="w-full resize-none overflow-hidden bg-transparent text-entry-title text-ink placeholder:text-rule focus:outline-none"
        />

        <EditorContent editor={editor} />

        {showData && (
          <EntryData
            slug={slug}
            onSlug={markDirty(setSlug)}
            summary={summary}
            onSummary={markDirty(setSummary)}
            tagsInput={tagsInput}
            onTags={markDirty(setTagsInput)}
            coverImageUrl={coverImageUrl}
            onCover={markDirty(setCoverImageUrl)}
            status={status}
            onStatus={markDirty(setStatus)}
            onDelete={saved ? remove : undefined}
          />
        )}

        {errorMsg && (
          <p className="text-entry-meta text-ink" role="alert">
            {errorMsg}
          </p>
        )}
      </main>

      {/* En el celular la barra va fija abajo, al alcance del pulgar. */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-5 border-t border-rule bg-paper px-4 pt-3 pb-7 md:hidden">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={secondaryClass}
        >
          foto
        </button>
        <button
          type="button"
          onClick={() => setShowData((open) => !open)}
          aria-expanded={showData}
          aria-controls="datos"
          className={secondaryClass}
        >
          datos
        </button>
        <div className="flex-1 [&>button]:w-full">{primaryButton}</div>
      </div>

      {showShortcuts && (
        <ShortcutList onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

function describeState(
  state: SaveState,
  status: Status,
  exists: boolean,
): string {
  const noun = status === "published" ? "publicada" : "borrador";
  switch (state) {
    case "saving":
      return "guardando…";
    case "dirty":
      return `${noun} · sin guardar`;
    case "saved":
      return `${noun} · guardado`;
    case "error":
      return `${noun} · no se guardó`;
    default:
      return exists ? noun : "nota nueva";
  }
}

const fieldClass =
  "w-full rounded-md border border-ink bg-paper px-3 py-2.5 text-body text-ink placeholder:text-faded focus:outline-2 focus:outline-offset-2 focus:outline-leaf";

/**
 * Los datos de la nota: dirección, resumen, tags, portada y estado.
 *
 * TODO: pasan al panel lateral del diseño (PR 10 del rediseño), con formato,
 * fecha y foco de la portada.
 */
function EntryData(props: {
  slug: string;
  onSlug: (value: string) => void;
  summary: string;
  onSummary: (value: string) => void;
  tagsInput: string;
  onTags: (value: string) => void;
  coverImageUrl: string;
  onCover: (value: string) => void;
  status: Status;
  onStatus: (value: Status) => void;
  onDelete?: () => void;
}) {
  return (
    <section
      id="datos"
      aria-label="datos de la nota"
      className="flex flex-col gap-5 border-t border-rule pt-6"
    >
      <Field label="dirección" hint="Si la dejas vacía se deriva del título.">
        {(id) => (
          <input
            id={id}
            value={props.slug}
            onChange={(e) => props.onSlug(e.target.value)}
            placeholder="se-deriva-del-titulo"
            className={fieldClass}
          />
        )}
      </Field>
      <Field
        label="resumen"
        hint="Opcional. Sale en la tarjeta y al compartir."
      >
        {(id) => (
          <textarea
            id={id}
            value={props.summary}
            onChange={(e) => props.onSummary(e.target.value)}
            rows={2}
            className={fieldClass}
          />
        )}
      </Field>
      <Field label="tags" hint="Separados por coma.">
        {(id) => (
          <input
            id={id}
            value={props.tagsInput}
            onChange={(e) => props.onTags(e.target.value)}
            placeholder="la prenda, costura"
            className={fieldClass}
          />
        )}
      </Field>
      <Field
        label="portada"
        hint="URL de la foto. Sin foto, la portada es tipográfica."
      >
        {(id) => (
          <input
            id={id}
            type="url"
            value={props.coverImageUrl}
            onChange={(e) => props.onCover(e.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        )}
      </Field>
      {/* Botones y no `Field`: un `<label>` que envuelve botones hace que
          tocar la etiqueta active uno de ellos. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-entry-meta text-ink">estado</legend>
        <div className="flex gap-2">
          {(["draft", "published"] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => props.onStatus(value)}
              aria-pressed={props.status === value}
              className={`rounded-full px-3 py-1.5 text-entry-meta transition-colors ${
                props.status === value
                  ? "bg-bottle text-paper"
                  : "border border-rule text-ink hover:border-ink"
              }`}
            >
              {value === "published" ? "publicada" : "borrador"}
            </button>
          ))}
        </div>
      </fieldset>
      {props.onDelete && (
        <button
          type="button"
          onClick={props.onDelete}
          className="self-start text-action text-faded hover:text-ink"
        >
          eliminar nota
        </button>
      )}
    </section>
  );
}

function ShortcutList({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center px-4">
      {/* El fondo es un botón y no un `div` con click: así cerrar tocando
          afuera también se puede con teclado. Esc lo cierra desde el editor. */}
      <button
        type="button"
        aria-label="cerrar atajos"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/25"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="atajos"
        className="relative w-full max-w-[480px] rounded-lg bg-paper px-7 py-6"
      >
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-card-title-sm text-ink">atajos</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-card-meta text-faded hover:text-ink"
          >
            cerrar · Esc
          </button>
        </div>
        <dl>
          {SHORTCUTS.map(([what, keys]) => (
            <div
              key={what}
              className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-b-0"
            >
              <dt className="text-body text-ink">{what}</dt>
              <dd className="text-entry-meta text-faded">{keys}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/**
 * Etiqueta, control y ayuda.
 *
 * `children` es una función que recibe el `id` en vez de un nodo suelto: así el
 * `htmlFor` del label y el `id` del control quedan atados sin poder
 * desincronizarse, y el linter puede comprobar que la etiqueta apunta a algo.
 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-entry-meta text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <span className="text-card-meta text-faded">{hint}</span>}
    </div>
  );
}
