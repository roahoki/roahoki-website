"use client";

import { Send } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import type { EventSlug } from "@/lib/birthday/events";
import type { GuestQuestion } from "@/lib/birthday/queries";
import { questionInputSchema } from "@/lib/schemas/birthday";

/**
 * Las dudas de un plan, al final de su sección: "¿me puedo quedar a dormir?",
 * con la respuesta de Joaquín.
 *
 * Una duda nueva queda a la vista solo de quien la hizo, como "esperando
 * respuesta", hasta que Joaquín la responde desde el panel; recién ahí la ven
 * todos. Así no quedan preguntas sin contestar a la vista de los demás.
 *
 * Cuando el plan ya pasó no se pregunta más, y si no hubo dudas la sección no
 * aparece.
 */
export function PlanQuestions({
  token,
  event,
  color,
  passed,
  initial,
}: {
  token: string;
  event: EventSlug;
  color: string;
  passed: boolean;
  initial: GuestQuestion[];
}) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  if (passed && items.length === 0) return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = questionInputSchema.safeParse({
      token,
      event,
      question: draft,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Escribe tu duda.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/birthday/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setItems((prev) => [...prev, data.question]);
      setDraft("");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "No se envió, inténtalo otra vez.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h3 id={titleId} className="text-card-title">
        dudas
      </h3>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 border-l-2 border-paper/50 pl-3.5"
            >
              <p className="text-card-title-sm">{item.question}</p>
              {item.answer ? (
                <p className="text-entry-body whitespace-pre-line">
                  {item.answer}
                </p>
              ) : (
                <p className="text-entry-meta opacity-75">
                  tu duda · te respondo pronto y aparece acá para todos
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-entry-body opacity-85">
          todavía no hay dudas. si tienes una, pregúntala acá :)
        </p>
      )}

      {!passed && (
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            rows={2}
            maxLength={300}
            placeholder="escribe tu duda"
            aria-label="tu duda"
            className="w-full resize-none rounded-xl border-[1.5px] border-paper/70 bg-transparent px-3.5 py-3 text-body text-paper outline-none placeholder:text-paper/55 focus:border-paper"
          />
          {error && (
            <p role="alert" className="text-entry-meta">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-paper px-4 text-action disabled:opacity-60"
            style={{ color }}
          >
            <Send className="size-[18px]" aria-hidden />
            {busy ? "enviando…" : "preguntar"}
          </button>
        </form>
      )}
    </section>
  );
}
