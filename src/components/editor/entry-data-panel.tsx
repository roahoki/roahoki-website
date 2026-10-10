"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  isSameDay,
  parseTagsInput,
  parseTimestamp,
  toDateInput,
  withDate,
} from "@/lib/logbook/editor";
import {
  COVER_FOCUS_CLASS,
  COVER_FOCUS_LABELS,
  COVER_FOCUSES,
  type CoverFocus,
  ENTRY_FORMAT_LABELS,
  ENTRY_FORMATS,
  type EntryFormat,
} from "@/lib/logbook/entry-format";
import { formatEntryDateShort } from "@/lib/logbook/format";
import { rejectReason } from "./image-upload";
import { uploadImage } from "./upload-image";

/**
 * El panel "datos de la nota" (brand book §7.4, admin).
 *
 * Todo lo que no es el texto: formato, fecha, tags, portada, resumen y
 * dirección. Va aparte para que el editor sea solo escribir. En escritorio es
 * un panel a la derecha; en el celular, una hoja que sube desde abajo.
 */

export type EntryStatus = "draft" | "published";

export type EntryData = {
  format: EntryFormat | null;
  /** `null` en una nota nueva: la fecha la pone la base al crearla. */
  publishedAt: string | null;
  tags: string[];
  /** Vacía si la portada es tipográfica. */
  coverImageUrl: string;
  coverFocus: CoverFocus;
  summary: string;
  slug: string;
  status: EntryStatus;
};

type Props = {
  data: EntryData;
  onChange: (changes: Partial<EntryData>) => void;
  /** El número de la nota; `null` hasta el primer guardado. */
  number: number | null;
  onClose: () => void;
  onDelete?: () => void;
  /** El último error del editor: con el panel abierto, se ve acá. */
  error: string;
  onError: (message: string) => void;
};

const chipClass = (selected: boolean) =>
  `rounded-full px-3 py-1.5 text-body transition-colors ${
    selected
      ? "bg-bottle text-paper"
      : "border border-rule text-ink hover:border-ink"
  }`;

const linkClass =
  "text-action text-leaf underline-offset-4 hover:underline disabled:opacity-50";

const fieldClass =
  "w-full rounded-md border border-ink bg-paper px-3 py-2.5 text-body text-ink placeholder:text-faded focus:outline-2 focus:outline-offset-2 focus:outline-leaf";

export function EntryDataPanel({
  data,
  onChange,
  number,
  onClose,
  onDelete,
  error,
  onError,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Al abrir, el foco entra al panel; al cerrar, vuelve a donde estaba (el
  // botón "datos"), para que con teclado no se pierda el lugar.
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-30">
      {/* El velo es un botón y no un `div` con click: cerrar tocando afuera
          también se puede con teclado. Esc lo cierra desde el editor. */}
      <button
        type="button"
        aria-label="cerrar datos"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/25"
      />
      <div
        ref={dialogRef}
        id="datos"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col gap-6 overflow-y-auto overscroll-contain rounded-t-2xl bg-paper px-4 pt-3 pb-10 focus:outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:px-7 md:pt-7"
      >
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-9 shrink-0 rounded-full bg-rule md:hidden"
        />
        <div className="flex items-baseline justify-between">
          <h2 id={titleId} className="text-card-title-sm text-ink">
            datos de la nota
          </h2>
          <button type="button" onClick={onClose} className={linkClass}>
            <span className="md:hidden">listo</span>
            <span className="hidden md:inline">cerrar · Esc</span>
          </button>
        </div>

        {error && (
          <p className="text-entry-meta text-ink" role="alert">
            {error}
          </p>
        )}

        <Group label="formato">
          <div className="flex flex-wrap gap-2">
            {ENTRY_FORMATS.map((format) => (
              <button
                type="button"
                key={format}
                aria-pressed={data.format === format}
                // Tocar el elegido lo quita: una nota puede no tener formato.
                onClick={() =>
                  onChange({ format: data.format === format ? null : format })
                }
                className={chipClass(data.format === format)}
              >
                {ENTRY_FORMAT_LABELS[format]}
              </button>
            ))}
          </div>
        </Group>

        <NumberAndDate
          number={number}
          publishedAt={data.publishedAt}
          onDate={(publishedAt) => onChange({ publishedAt })}
        />

        <Tags tags={data.tags} onTags={(tags) => onChange({ tags })} />

        <Cover
          url={data.coverImageUrl}
          focus={data.coverFocus}
          onChange={onChange}
          onError={onError}
        />

        <Group label="resumen" hint="opcional · sale en la tarjeta">
          {(id) => (
            <textarea
              id={id}
              value={data.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              rows={2}
              placeholder="Un par de líneas para la tarjeta. Si queda vacío, la tarjeta va sin resumen."
              className={fieldClass}
            />
          )}
        </Group>

        <Address slug={data.slug} onSlug={(slug) => onChange({ slug })} />

        <div className="flex flex-col gap-6 border-t border-rule pt-6">
          <Group label="estado">
            <div className="flex gap-2">
              {(["draft", "published"] as const).map((status) => (
                <button
                  type="button"
                  key={status}
                  aria-pressed={data.status === status}
                  onClick={() => onChange({ status })}
                  className={chipClass(data.status === status)}
                >
                  {status === "published" ? "publicada" : "borrador"}
                </button>
              ))}
            </div>
          </Group>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="self-start text-action text-faded hover:text-ink"
            >
              eliminar nota
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberAndDate({
  number,
  publishedAt,
  onDate,
}: {
  number: number | null;
  publishedAt: string | null;
  onDate: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  // Una nota nueva todavía no tiene fecha: la pone la base al crearla, hoy.
  const current = publishedAt ?? new Date().toISOString();
  const date = parseTimestamp(current);
  const label = isSameDay(date, new Date())
    ? `hoy, ${formatEntryDateShort(date.toISOString())}`
    : formatEntryDateShort(date.toISOString());

  return (
    <Group
      label="número y fecha"
      hint={
        number === null
          ? "el número se asigna al guardar"
          : "el número es automático"
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-body text-ink">
        <span>{number === null ? "#–" : `#${number}`}</span>
        {editing ? (
          <input
            type="date"
            aria-label="fecha"
            value={toDateInput(current)}
            onChange={(e) => {
              if (e.target.value) onDate(withDate(current, e.target.value));
            }}
            onBlur={() => setEditing(false)}
            className="rounded-md border border-ink bg-paper px-2 py-1 text-body text-ink"
          />
        ) : (
          <>
            <span>{label}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={linkClass}
            >
              cambiar
            </button>
          </>
        )}
      </div>
    </Group>
  );
}

function Tags({
  tags,
  onTags,
}: {
  tags: string[];
  onTags: (tags: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    // Se aceptan varios separados por coma, normalizados igual que en zod.
    const added = parseTagsInput(draft);
    if (added.length > 0) onTags([...new Set([...tags, ...added])]);
    setDraft("");
  }

  return (
    <Group label="tags">
      <ul className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <li key={tag}>
            <button
              type="button"
              aria-label={`quitar ${tag}`}
              onClick={() => onTags(tags.filter((t) => t !== tag))}
              className="rounded-full bg-bottle px-2.5 py-0.5 text-tag text-paper hover:bg-ink"
            >
              {tag} ×
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <input
              // El foco va directo al campo: es lo que se pidió al tocar
              // "+ agregar".
              // biome-ignore lint/a11y/noAutofocus: aparece por una acción explícita
              autoFocus
              aria-label="nuevo tag"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  // Que Esc cierre el campo y no el panel entero.
                  e.stopPropagation();
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                commit();
                setAdding(false);
              }}
              placeholder="costura"
              className="w-36 rounded-full border border-ink bg-paper px-3 py-1.5 text-body text-ink placeholder:text-faded focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={chipClass(false)}
            >
              + agregar
            </button>
          )}
        </li>
      </ul>
    </Group>
  );
}

function Cover({
  url,
  focus,
  onChange,
  onError,
}: {
  url: string;
  focus: CoverFocus;
  onChange: (changes: Partial<EntryData>) => void;
  onError: (message: string) => void;
}) {
  const [wantsPhoto, setWantsPhoto] = useState(url !== "");
  const [progress, setProgress] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Volver a "tipográfica" y otra vez a "foto" recupera la foto que había.
  const lastUrl = useRef(url);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    const reason = rejectReason(file);
    if (reason) {
      onError(reason);
      return;
    }

    setProgress(`subiendo ${file.name} · 0 %`);
    try {
      const uploaded = await uploadImage(file, (percent) =>
        setProgress(`subiendo ${file.name} · ${Math.round(percent)} %`),
      );
      lastUrl.current = uploaded;
      onChange({ coverImageUrl: uploaded });
    } catch (error) {
      onError(
        `${file.name}: ${error instanceof Error ? error.message : "no se pudo subir."}`,
      );
    } finally {
      setProgress(null);
    }
  }

  function choose(photo: boolean) {
    setWantsPhoto(photo);
    onChange({ coverImageUrl: photo ? lastUrl.current : "" });
  }

  return (
    <Group label="portada" hint="en la tarjeta se ve en 2:1">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={!wantsPhoto}
            onClick={() => choose(false)}
            className={chipClass(!wantsPhoto)}
          >
            tipográfica
          </button>
          <button
            type="button"
            aria-pressed={wantsPhoto}
            onClick={() => choose(true)}
            className={chipClass(wantsPhoto)}
          >
            foto
          </button>
        </div>

        {wantsPhoto && (
          <>
            {/* Toda la caja es el botón: tocarla elige una foto, y también se
                puede soltar una encima. */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                upload(e.dataTransfer.files[0]);
              }}
              disabled={progress !== null}
              aria-label={
                url ? "cambiar la foto de portada" : "elegir la foto de portada"
              }
              className={`relative mt-2 aspect-[2/1] w-full overflow-hidden rounded-md bg-ink text-entry-meta text-paper/80 ${
                dragging ? "outline-[3px] outline-offset-2 outline-leaf" : ""
              }`}
            >
              {url && (
                // `img` y no `next/image`: la portada puede venir de una URL
                // que no está en `remotePatterns`, y en el panel no hace falta
                // optimizarla.
                // biome-ignore lint/performance/noImgElement: ver arriba
                <img
                  src={url}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover ${COVER_FOCUS_CLASS[focus]}`}
                />
              )}
              <span
                className={`relative rounded px-2 py-1 ${url ? "bg-ink/60" : ""}`}
              >
                {progress ??
                  (url
                    ? "cambiar foto · o arrastrar otra acá"
                    : "elegir foto · o arrastrarla acá")}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              aria-label="foto de portada"
              className="hidden"
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {url && (
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="float-left mr-1 text-entry-meta text-faded">
                  qué parte se ve
                </legend>
                {COVER_FOCUSES.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={focus === value}
                    onClick={() => onChange({ coverFocus: value })}
                    className={chipClass(focus === value)}
                  >
                    {COVER_FOCUS_LABELS[value]}
                  </button>
                ))}
              </fieldset>
            )}
          </>
        )}
      </div>
    </Group>
  );
}

function Address({
  slug,
  onSlug,
}: {
  slug: string;
  onSlug: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Group
      label="dirección"
      hint={slug ? undefined : "se deriva del título al guardar"}
    >
      {editing ? (
        (id) => (
          <input
            id={id}
            // biome-ignore lint/a11y/noAutofocus: aparece por una acción explícita
            autoFocus
            value={slug}
            onChange={(e) => onSlug(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(false);
            }}
            placeholder="se-deriva-del-titulo"
            className={fieldClass}
          />
        )
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="break-all text-body text-ink">
            /logbook/{slug || "…"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={linkClass}
          >
            editar
          </button>
        </div>
      )}
    </Group>
  );
}

/**
 * Etiqueta, pista y contenido de un grupo del panel.
 *
 * `children` puede ser una función que recibe el `id`: así el `htmlFor` del
 * label y el `id` del control quedan atados sin poder desincronizarse. Si es
 * un nodo (un grupo de botones), la etiqueta va como texto: un `<label>` que
 * envuelve botones hace que tocarlo active uno de ellos.
 */
function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode | ((id: string) => React.ReactNode);
}) {
  const id = useId();
  const heading = (
    <>
      <span className="text-entry-meta text-ink">{label}</span>
      {hint && <span className="text-card-meta text-faded">{hint}</span>}
    </>
  );

  if (typeof children === "function") {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2">
          {heading}
        </label>
        {children(id)}
      </div>
    );
  }

  // Un grupo de botones: `fieldset` y `legend` le dan nombre al grupo.
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-2 flex flex-wrap items-baseline gap-x-2">
        {heading}
      </legend>
      {children}
    </fieldset>
  );
}
