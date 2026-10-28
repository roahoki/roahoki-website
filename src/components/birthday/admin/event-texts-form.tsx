"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { EventDetail, EventSlug } from "@/lib/birthday/events";
import { eventTextsSchema, firstErrorMessage } from "@/lib/schemas/birthday";
import { request } from "./request";

/**
 * Los textos de un plan: la pregunta y los datos que ve cada invitado. Se
 * guardan en la base y la página del invitado los toma al tiro, sin PR.
 *
 * Valida con el mismo esquema que la API antes de mandar, para mostrar el
 * error sin ir y volver. "volver a los originales" borra la corrección y el
 * plan usa otra vez los textos de `events.ts`.
 */
export function EventTextsForm({
  event,
  initial,
  edited,
}: {
  event: EventSlug;
  initial: { question: string; details: readonly EventDetail[] };
  /** Si hoy usa textos corregidos (y no los de código). */
  edited: boolean;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState(initial.question);
  const [details, setDetails] = useState<EventDetail[]>([...initial.details]);
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const touch = () => setState("idle");
  const update = (index: number, field: keyof EventDetail, value: string) => {
    touch();
    setDetails((prev) =>
      prev.map((detail, i) =>
        i === index ? { ...detail, [field]: value } : detail,
      ),
    );
  };
  const move = (index: number, by: -1 | 1) => {
    touch();
    setDetails((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  };

  async function send(
    texts: { question: string; details: EventDetail[] } | null,
  ) {
    setState("busy");
    setError(null);
    const result = await request("/api/admin/birthday/texts", "PUT", {
      event,
      texts,
    });
    if (!result.ok) {
      setState("idle");
      setError(result.error);
      return false;
    }
    setState("saved");
    router.refresh();
    return true;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = eventTextsSchema.safeParse({ question, details });
    if (!parsed.success) {
      setError(firstErrorMessage(parsed.error));
      return;
    }
    await send(parsed.data);
  }

  const input =
    "w-full rounded-lg border-[1.5px] border-rule bg-transparent px-3.5 py-2.5 text-body text-ink outline-none placeholder:text-faded focus:border-ink";
  const icon =
    "flex size-9 items-center justify-center rounded-full text-faded disabled:opacity-30";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-card-meta text-faded">pregunta</span>
        <input
          value={question}
          onChange={(e) => {
            touch();
            setQuestion(e.target.value);
          }}
          className={input}
        />
      </label>

      <ol className="flex flex-col gap-3">
        {details.map((detail, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: las filas no tienen id y se editan en su lugar.
            key={index}
            className="flex flex-col gap-2 rounded-xl border-[1.5px] border-rule p-3"
          >
            <div className="flex items-center gap-1">
              <input
                value={detail.label}
                onChange={(e) => update(index, "label", e.target.value)}
                placeholder="subtítulo, ej. ¿dónde nos juntamos?"
                aria-label={`subtítulo del dato ${index + 1}`}
                className={`${input} font-bold`}
              />
              <button
                type="button"
                className={icon}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={`subir el dato ${index + 1}`}
              >
                <ArrowUp className="size-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                className={icon}
                disabled={index === details.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`bajar el dato ${index + 1}`}
              >
                <ArrowDown className="size-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                className={icon}
                onClick={() => {
                  touch();
                  setDetails((prev) => prev.filter((_, i) => i !== index));
                }}
                aria-label={`quitar el dato ${index + 1}`}
              >
                <X className="size-[18px]" aria-hidden />
              </button>
            </div>
            <textarea
              value={detail.value}
              onChange={(e) => update(index, "value", e.target.value)}
              rows={2}
              placeholder="lo que dice"
              aria-label={`texto del dato ${index + 1}`}
              className={`${input} resize-y`}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          touch();
          setDetails((prev) => [...prev, { label: "", value: "" }]);
        }}
        className="inline-flex h-10 items-center gap-1.5 self-start rounded-full border-[1.5px] border-ink px-3.5 text-action"
      >
        <Plus className="size-[18px]" aria-hidden />
        agregar dato
      </button>

      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "busy"}
          className="h-11 rounded-full bg-ink px-5 text-action text-paper disabled:opacity-60"
        >
          {state === "saved" ? "guardado" : "guardar textos"}
        </button>
        {edited && (
          <button
            type="button"
            disabled={state === "busy"}
            onClick={async () => {
              await send(null);
            }}
            className="text-entry-meta text-faded underline underline-offset-4"
          >
            volver a los originales
          </button>
        )}
      </div>
      <p className="text-card-meta text-faded">
        Los invitados ven el cambio apenas recargan su página. La fecha, la hora
        y el color no se cambian desde acá.
      </p>
    </form>
  );
}
