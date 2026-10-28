"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import type { EventSlug } from "@/lib/birthday/events";

/**
 * Responder un plan: la lógica que comparten los botones voy / no voy y la
 * subida al Manquehue.
 *
 * La respuesta se marca al instante y se revierte si el servidor dice que no.
 * Al guardarse, la página se recarga en el lugar para que quien responde
 * aparezca (o desaparezca) entre quienes van, y un "voy" avisa con `onGoing`
 * (para pedir el dibujo del roki).
 */
export function useRsvp({
  token,
  event,
  initial,
  onGoing,
}: {
  token: string;
  event: EventSlug;
  initial: RsvpStatus | null;
  onGoing?: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function answer(next: RsvpStatus): Promise<boolean> {
    if (next === status) return true;
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
      return true;
    } catch (cause) {
      setStatus(before);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "No se guardó, inténtalo otra vez o escríbeme.",
      );
      return false;
    }
  }

  return { status, error, answer };
}
