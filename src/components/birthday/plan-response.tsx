"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import type { EventSlug } from "@/lib/birthday/events";
import type { Attendee } from "@/lib/birthday/queries";
import type { Roki } from "@/lib/birthday/roki";
import { DrawSheet } from "./draw-sheet";
import { RsvpButtons } from "./rsvp-buttons";
import { WhoIsGoing } from "./who-is-going";

/**
 * Lo que se toca en la página de un plan: el voy / no voy, quiénes van y la
 * hoja para dibujar el roki.
 *
 * El dibujo se pide **la primera vez que el invitado dice voy**, en cualquier
 * plan: la respuesta ya quedó guardada antes de abrir la hoja, así que cerrarla
 * a medias no pierde nada ("dibújalo después" deja el roki genérico). Después
 * su roki cae directo a cada pila. Tocando su propio roki lo puede redibujar.
 */
export function PlanResponse({
  token,
  plan,
  status,
  passed,
  attendees,
  me,
}: {
  token: string;
  plan: { slug: EventSlug; title: string; color: string; question: string };
  status: RsvpStatus | null;
  passed: boolean;
  attendees: Attendee[];
  me: { id: string; roki: Roki | null };
}) {
  const router = useRouter();
  const [drawing, setDrawing] = useState(false);

  return (
    <>
      {!passed && (
        <section className="flex flex-col gap-3">
          <h2 className="text-card-title">{plan.question}</h2>
          <RsvpButtons
            token={token}
            event={plan.slug}
            color={plan.color}
            initial={status}
            onGoing={() => {
              if (!me.roki) setDrawing(true);
            }}
          />
        </section>
      )}

      <WhoIsGoing
        attendees={attendees}
        meId={me.id}
        color={plan.color}
        onTapMine={() => setDrawing(true)}
      />

      <DrawSheet
        open={drawing}
        onOpenChange={setDrawing}
        token={token}
        planTitle={plan.title}
        planColor={plan.color}
        previous={me.roki}
        onSaved={() => {
          setDrawing(false);
          router.refresh();
        }}
      />
    </>
  );
}
