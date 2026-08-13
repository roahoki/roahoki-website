"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { LogbookEntry } from "@/db/schema";
import {
  formatTagsInput,
  imageMarkdown,
  insertAsBlock,
  parseTagsInput,
} from "@/lib/logbook/editor";
import { MarkdownContent } from "@/lib/markdown";

/**
 * Editor de una nota. Sirve para crear y para editar.
 *
 * Es `textarea` + preview y no un WYSIWYG a propósito: el cuerpo se guarda como
 * markdown crudo, y un WYSIWYG obligaría a mantener una conversión en los dos
 * sentidos para ganar poco. Escribir markdown a mano ya es el flujo.
 *
 * Mobile-first porque el caso de uso es publicar desde el celular: los campos
 * van apilados, la barra de acciones queda fija abajo, y el `textarea` ocupa
 * todo el alto disponible.
 */

type Props = {
  /** Si viene, se está editando; si no, creando. */
  entry?: LogbookEntry;
};

type SaveState = "idle" | "saving" | "uploading" | "error";

export function LogbookEditor({ entry }: Props) {
  const router = useRouter();
  const isEditing = entry !== undefined;

  const [title, setTitle] = useState(entry?.title ?? "");
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [summary, setSummary] = useState(entry?.summary ?? "");
  const [bodyMd, setBodyMd] = useState(entry?.bodyMd ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    entry?.coverImageUrl ?? "",
  );
  const [tagsInput, setTagsInput] = useState(
    formatTagsInput(entry?.tags ?? []),
  );
  const [status, setStatus] = useState<"draft" | "published">(
    entry?.status ?? "published",
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar
    // el evento.
    e.target.value = "";
    if (!file) return;

    setSaveState("uploading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/logbook/images", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "No se pudo subir la imagen.");
        setSaveState("error");
        return;
      }

      insertImage(data.url);
      setSaveState("idle");
    } catch {
      setErrorMsg("No se pudo subir la imagen.");
      setSaveState("error");
    }
  }

  /** Mete el markdown de la imagen donde está el cursor y lo deja después. */
  function insertImage(url: string) {
    const textarea = bodyRef.current;
    const selection = textarea
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : { start: bodyMd.length, end: bodyMd.length };

    const result = insertAsBlock(bodyMd, imageMarkdown(url), selection);
    setBodyMd(result.value);

    // React reescribe el `value` y el browser manda el cursor al final, así que
    // hay que reponerlo después del re-render.
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.selection.start, result.selection.end);
    });
  }

  async function save() {
    setSaveState("saving");
    setErrorMsg("");

    const payload = {
      title,
      summary: summary || null,
      bodyMd,
      coverImageUrl: coverImageUrl || null,
      tags: parseTagsInput(tagsInput),
      status,
      // Al crear, un slug vacío hace que el servidor lo derive del título.
      ...(slug ? { slug } : {}),
    };

    const res = await fetch(
      isEditing ? `/api/admin/logbook/${entry.id}` : "/api/admin/logbook",
      {
        method: isEditing ? "PATCH" : "POST",
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

    router.push("/admin/logbook");
    router.refresh();
  }

  async function remove() {
    if (!entry) return;
    if (!confirm("¿Eliminar esta nota? No se puede deshacer.")) return;

    const res = await fetch(`/api/admin/logbook/${entry.id}`, {
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

  const busy = saveState === "saving" || saveState === "uploading";

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-sm font-bold text-foreground shrink-0">
          {isEditing ? "Editar nota" : "Nueva nota"}
        </h1>
        <a
          href="/admin/logbook"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Volver
        </a>
      </div>

      <div className="space-y-4">
        <Field label="Título">
          {(id) => (
            <input
              id={id}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="El título de la nota"
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Slug"
          hint={
            isEditing
              ? "Cambiarlo rompe los links ya compartidos."
              : "Si lo dejas vacío se deriva del título."
          }
        >
          {(id) => (
            <input
              id={id}
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="se-deriva-del-titulo"
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Resumen"
          hint="Sale en el listado y al compartir el link."
        >
          {(id) => (
            <textarea
              id={id}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Tags" hint="Separados por coma.">
          {(id) => (
            <input
              id={id}
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="rails, postgres"
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Portada" hint="URL de la imagen que se ve al compartir.">
          {(id) => (
            <input
              id={id}
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          )}
        </Field>

        {/* Cuerpo, con el toggle de preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">
              Cuerpo
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="text-xs text-brand hover:underline disabled:opacity-50"
              >
                {saveState === "uploading" ? "Subiendo..." : "Subir imagen"}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPreview ? "Editar" : "Vista previa"}
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImagePick}
            className="hidden"
          />

          {showPreview ? (
            <div className="min-h-[50vh] rounded-lg border border-border bg-card p-4 prose-logbook">
              {bodyMd.trim() === "" ? (
                <p className="text-sm text-muted-foreground">
                  Nada que previsualizar todavía.
                </p>
              ) : (
                <MarkdownContent>{bodyMd}</MarkdownContent>
              )}
            </div>
          ) : (
            <textarea
              ref={bodyRef}
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              placeholder="# Escribe en markdown"
              className={`${inputClass} min-h-[50vh] font-mono text-[13px] leading-relaxed`}
            />
          )}
        </div>

        {/* No usa `Field` porque son botones y no un control: un `<label>` que
            envuelve botones hace que tocar la etiqueta active uno de ellos. */}
        <fieldset>
          <legend className="text-xs font-semibold text-foreground mb-1.5">
            Estado
          </legend>
          <div className="flex gap-2">
            {(["published", "draft"] as const).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setStatus(value)}
                aria-pressed={status === value}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  status === value
                    ? "bg-brand text-white border-brand"
                    : "border-border text-muted-foreground hover:border-brand/40"
                }`}
              >
                {value === "published" ? "Publicada" : "Borrador"}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {errorMsg && (
        <p className="mt-4 text-xs text-red-500" role="alert">
          {errorMsg}
        </p>
      )}

      {/* Barra fija: en el celular el botón de guardar tiene que estar siempre
          al alcance del pulgar, sin scrollear hasta el final de la nota. */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saveState === "saving" ? "Guardando..." : "Guardar"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-colors disabled:opacity-50"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none";

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
  const hintId = `${id}-hint`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-foreground mb-1.5"
      >
        {label}
      </label>
      {children(id)}
      {hint && (
        <span
          id={hintId}
          className="block text-[11px] text-muted-foreground mt-1"
        >
          {hint}
        </span>
      )}
    </div>
  );
}
