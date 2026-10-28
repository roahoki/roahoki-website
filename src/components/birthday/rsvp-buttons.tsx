"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import type { EventSlug } from "@/lib/birthday/events";

/**
 * Voy / no voy. La respuesta se marca al tocar y se revierte si el servidor
 * dice que no; al guardarse, la página se recarga en el lugar para que quien
 * responde aparezca (o desaparezca) entre quienes van.
 */
export function RsvpButtons({
  token,
  event,
  color,
  initial,
  onGoing,
}: {
  token: string;
  event: EventSlug;
  color: string;
  initial: RsvpStatus | null;
  /** Se llama cuando un "voy" quedó guardado (para pedir el dibujo). */
  onGoing?: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function answer(next: RsvpStatus) {
    if (next === status) return;
    const before = status;
    setStatus(next);
    setError(null);
    try {
      const res = await fetch("/api/birthday/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, event, status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error);
      }
      router.refresh();
      if (next === "going") onGoing?.();
    } catch (cause) {
      setStatus(before);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "No se guardó, inténtalo otra vez o escríbeme.",
      );
    }
  }

  const base =
    "inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-paper px-4 text-action";

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex gap-2">
        <legend className="sr-only">tu respuesta</legend>
        <button
          type="button"
          aria-pressed={status === "going"}
          onClick={() => answer("going")}
          className={base}
          style={
            status === "going"
              ? { backgroundColor: "var(--paper)", color }
              : undefined
          }
        >
          <Check className="size-[18px]" aria-hidden />
          voy
        </button>
        <button
          type="button"
          aria-pressed={status === "not_going"}
          onClick={() => answer("not_going")}
          className={base}
          style={
            status === "not_going"
              ? { backgroundColor: "var(--paper)", color }
              : undefined
          }
        >
          no voy
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="text-entry-meta">
          {error}
        </p>
      )}
    </div>
  );
}
