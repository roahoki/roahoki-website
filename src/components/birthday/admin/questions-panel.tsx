"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { EventSlug } from "@/lib/birthday/events";
import type { AdminQuestion } from "@/lib/birthday/queries";
import {
  answerInputSchema,
  faqInputSchema,
  firstErrorMessage,
} from "@/lib/schemas/birthday";
import { request } from "./request";

/**
 * Las dudas de un plan en el panel: primero las que esperan respuesta, con
 * quién las hizo. Responder una la publica para todos los invitados al plan;
 * la respuesta se puede corregir después. Abajo, publicar una duda frecuente
 * ya respondida, para adelantarse a lo que van a preguntar.
 */
export function QuestionsPanel({
  event,
  questions,
}: {
  event: EventSlug;
  questions: AdminQuestion[];
}) {
  const pending = questions.filter((q) => q.answer === null);
  const answered = questions.filter((q) => q.answer !== null);

  return (
    <div className="flex flex-col gap-5">
      {questions.length === 0 && (
        <p className="text-body text-faded">Todavía nadie pregunta nada.</p>
      )}
      {pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((question) => (
            <QuestionItem key={question.id} question={question} />
          ))}
        </ul>
      )}
      {answered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {answered.map((question) => (
            <QuestionItem key={question.id} question={question} />
          ))}
        </ul>
      )}
      <FaqForm event={event} />
    </div>
  );
}

const field =
  "w-full rounded-lg border-[1.5px] border-rule bg-transparent px-3.5 py-2.5 text-body text-ink outline-none placeholder:text-faded focus:border-ink";

function QuestionItem({ question }: { question: AdminQuestion }) {
  const router = useRouter();
  const [editing, setEditing] = useState(question.answer === null);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = answerInputSchema.safeParse({ answer });
    if (!parsed.success) {
      setError(firstErrorMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await request(
      `/api/admin/birthday/questions/${question.id}`,
      "PATCH",
      parsed.data,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("¿Borrar esta duda? Nadie la va a ver más.")) return;
    setBusy(true);
    const result = await request(
      `/api/admin/birthday/questions/${question.id}`,
      "DELETE",
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border-[1.5px] border-rule p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-card-meta text-faded">
            {question.guestName ?? "duda frecuente"}
            {question.answer === null ? " · sin responder" : ""}
          </span>
          <p className="text-card-title-sm">{question.question}</p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-faded"
          aria-label={`borrar la duda «${question.question}»`}
        >
          <Trash2 className="size-[18px]" aria-hidden />
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="tu respuesta"
            aria-label={`respuesta a «${question.question}»`}
            className={`${field} resize-y`}
          />
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-full bg-ink px-4 text-action text-paper disabled:opacity-60"
            >
              {question.answer === null ? "responder" : "guardar"}
            </button>
            {question.answer !== null && (
              <button
                type="button"
                onClick={() => {
                  setAnswer(question.answer ?? "");
                  setEditing(false);
                }}
                className="text-entry-meta text-faded underline underline-offset-4"
              >
                cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <p className="text-body whitespace-pre-line">{question.answer}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-entry-meta text-faded underline underline-offset-4"
          >
            editar respuesta
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}
    </li>
  );
}

function FaqForm({ event }: { event: EventSlug }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = faqInputSchema.safeParse({ event, question, answer });
    if (!parsed.success) {
      setError(firstErrorMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await request(
      "/api/admin/birthday/questions",
      "POST",
      parsed.data,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuestion("");
    setAnswer("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <span className="text-card-meta text-faded">
        publicar una duda frecuente
      </span>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="¿me puedo quedar a dormir?"
        aria-label="duda frecuente"
        className={field}
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        placeholder="la respuesta"
        aria-label="respuesta de la duda frecuente"
        className={`${field} resize-y`}
      />
      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-10 self-start rounded-full border-[1.5px] border-ink px-4 text-action disabled:opacity-60"
      >
        publicar
      </button>
    </form>
  );
}
