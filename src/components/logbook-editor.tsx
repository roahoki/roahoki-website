"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LogbookEntry } from "@/db/schema";
import { DEFAULT_COVER_CROP } from "@/lib/logbook/cover-crop";
import { ENTRY_FORMAT_LABELS } from "@/lib/logbook/entry-format";
import { formatEntryDateShort, formatTimeAgo } from "@/lib/logbook/format";
import {
  type EntryData,
  EntryDataPanel,
  type EntryStatus,
} from "./editor/entry-data-panel";
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
 * Los borradores se guardan solos unos segundos después de dejar de escribir.
 * Una nota publicada no: cada guardado cambia lo que ya se ve en el sitio, así
 * que eso se hace a propósito, con "guardar".
 *
 * Mobile-first: en el celular la barra de acciones queda fija abajo; en
 * escritorio va arriba, con el contador de palabras.
 */

type Props = {
  /** Si viene, se está editando; si no, creando. */
  entry?: LogbookEntry;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** Cuánto se espera sin cambios antes de guardar un borrador solo. */
export const AUTOSAVE_DELAY_MS = 2500;

function initialData(entry?: LogbookEntry): EntryData {
  return {
    format: entry?.format ?? null,
    publishedAt: entry?.publishedAt ?? null,
    tags: entry?.tags ?? [],
    coverImageUrl: entry?.coverImageUrl ?? "",
    coverCrop: entry
      ? { x: entry.coverCropX, y: entry.coverCropY, zoom: entry.coverZoom }
      : DEFAULT_COVER_CROP,
    summary: entry?.summary ?? "",
    slug: entry?.slug ?? "",
    // Una nota nueva nace borrador: se publica a propósito, con "publicar".
    status: entry?.status ?? "draft",
  };
}

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
  const [data, setData] = useState(() => initialData(entry));
  const status = data.status;

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // Cada cambio suma uno. Sirve para saber si algo cambió mientras se
  // guardaba: en ese caso lo guardado ya no es lo último y sigue "sin guardar".
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const now = useNow(15_000);
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
    onUpdate: () => markChanged(),
  });

  const words =
    useEditorState({
      editor,
      selector: ({ editor: current }) => countWords(current?.getText() ?? ""),
    }) ?? 0;

  function markChanged() {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setSaveState("dirty");
  }

  function updateData(changes: Partial<EntryData>) {
    setData((current) => ({ ...current, ...changes }));
    markChanged();
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
  async function save(nextStatus: EntryStatus, { leave }: { leave: boolean }) {
    // Con un ref y no con `saveState`: el guardado automático y Ctrl S pueden
    // llegar en el mismo instante, antes de que el estado se actualice.
    if (!editor || savingRef.current) return;
    // Guardar sin salir sí se puede: el aviso de "subiendo" no es parte del
    // cuerpo y la imagen entra cuando termina.
    if (leave && uploading > 0) {
      setErrorMsg("Espera a que terminen de subir las imágenes.");
      return;
    }
    savingRef.current = true;
    setSaveState("saving");
    setErrorMsg("");
    const startedAt = revisionRef.current;

    const payload = {
      title,
      summary: data.summary || null,
      bodyMd: editor.getMarkdown(),
      coverImageUrl: data.coverImageUrl || null,
      coverCropX: data.coverCrop.x,
      coverCropY: data.coverCrop.y,
      coverZoom: data.coverCrop.zoom,
      format: data.format,
      tags: data.tags,
      status: nextStatus,
      // Al crear, un slug vacío hace que el servidor lo derive del título.
      ...(data.slug ? { slug: data.slug } : {}),
      // La fecha solo viaja si se cambió en el panel. Sin cambios, la deja
      // como está (o la pone la base, al crear).
      ...(data.publishedAt && data.publishedAt !== saved?.publishedAt
        ? { publishedAt: data.publishedAt }
        : {}),
    };

    let res: Response;
    let body: { entry?: LogbookEntry; error?: string };
    try {
      res = await fetch(
        saved ? `/api/admin/logbook/${saved.id}` : "/api/admin/logbook",
        {
          method: saved ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      body = await res.json();
    } catch {
      setErrorMsg("No se pudo guardar; revisa la conexión.");
      setSaveState("error");
      return;
    } finally {
      savingRef.current = false;
    }

    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (!res.ok || !body.entry) {
      setErrorMsg(body.error ?? "No se pudo guardar.");
      setSaveState("error");
      return;
    }

    if (leave) {
      router.push("/admin/logbook");
      router.refresh();
      return;
    }

    const stored = body.entry;
    if (!saved) {
      // La URL pasa a ser la de la nota sin recargar la página: recargarla
      // movería el cursor y el scroll de quien está escribiendo.
      window.history.replaceState(null, "", `/admin/logbook/${stored.id}`);
    }
    setSaved(stored);
    setSavedAt(new Date().toISOString());

    const changedMeanwhile = revisionRef.current !== startedAt;
    // Lo que decide el servidor (la dirección derivada, la fecha) se toma de
    // vuelta, salvo que se haya seguido editando: pisaría lo nuevo.
    setData((current) =>
      changedMeanwhile
        ? { ...current, status: nextStatus }
        : {
            ...current,
            status: nextStatus,
            slug: stored.slug,
            publishedAt: stored.publishedAt,
          },
    );
    setSaveState(changedMeanwhile ? "dirty" : "saved");
  }

  /** El guardado automático: solo borradores, y solo si hay algo que guardar. */
  function autosave() {
    if (!editor || data.status !== "draft") return;
    // El título y el cuerpo son obligatorios: sin ellos la API lo rechaza, y
    // un error a los dos segundos de abrir una nota nueva no ayuda.
    if (title.trim() === "" || editor.isEmpty) return;
    save("draft", { leave: false });
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
  const actions = useRef({ save, promptLink, status, autosave });
  actions.current = { save, promptLink, status, autosave };

  // Cada cambio reinicia la cuenta: se guarda cuando se deja de escribir, no
  // a cada letra.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `revision` reinicia la cuenta a propósito
  useEffect(() => {
    if (saveState !== "dirty" || status !== "draft") return;
    const timer = setTimeout(
      () => actions.current.autosave(),
      AUTOSAVE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [revision, saveState, status]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowData(false);
      }
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
      : describeState(saveState, status, saved !== undefined, savedAt, now);

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
            {data.publishedAt && status === "published"
              ? formatEntryDateShort(data.publishedAt)
              : "sin publicar"}
          </span>
          {data.format && <span>{ENTRY_FORMAT_LABELS[data.format]}</span>}
        </p>

        <label htmlFor="entry-title" className="sr-only">
          título
        </label>
        <textarea
          id="entry-title"
          ref={titleRef}
          rows={1}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markChanged();
          }}
          placeholder="título"
          className="w-full resize-none overflow-hidden bg-transparent text-entry-title text-ink placeholder:text-rule focus:outline-none"
        />

        <EditorContent editor={editor} />

        {errorMsg && !showData && (
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

      {showData && (
        <EntryDataPanel
          data={data}
          title={title}
          onChange={updateData}
          number={saved?.number ?? null}
          onClose={() => setShowData(false)}
          onDelete={saved ? remove : undefined}
          error={errorMsg}
          onError={setErrorMsg}
        />
      )}

      {showShortcuts && (
        <ShortcutList onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

function describeState(
  state: SaveState,
  status: EntryStatus,
  exists: boolean,
  savedAt: string | null,
  now: Date,
): string {
  const noun = status === "published" ? "publicada" : "borrador";
  switch (state) {
    case "saving":
      return "guardando…";
    case "dirty":
      return `${noun} · sin guardar`;
    case "saved":
      return savedAt
        ? `${noun} · guardado ${formatTimeAgo(savedAt, now)}`
        : `${noun} · guardado`;
    case "error":
      return `${noun} · no se guardó`;
    default:
      return exists ? noun : "nota nueva";
  }
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
 * La hora actual, renovada cada `intervalMs`. Para que "guardado hace 2 min"
 * avance solo, sin esperar a otro cambio.
 */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
