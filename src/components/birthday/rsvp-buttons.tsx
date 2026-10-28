"use client";

import { Check } from "lucide-react";
import type { RsvpStatus } from "@/db/schema";
import type { EventSlug } from "@/lib/birthday/events";
import { useRsvp } from "./use-rsvp";

/**
 * Voy / no voy, para todos los planes menos el Manquehue (que se sube). La
 * lógica de responder está en `useRsvp`.
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
  const { status, error, answer } = useRsvp({ token, event, initial, onGoing });

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
