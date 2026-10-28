"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import type { EventSlug } from "@/lib/birthday/events";
import type { Attendee } from "@/lib/birthday/queries";
import type { Roki } from "@/lib/birthday/roki";
import { DrawSheet } from "./draw-sheet";
import { RokiFigure } from "./roki-figure";
import { RsvpButtons } from "./rsvp-buttons";

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

      <section
        aria-labelledby="quienes-van"
        className="rounded-2xl bg-paper px-4 pt-3.5 pb-5 text-ink"
      >
        <h2 id="quienes-van" className="text-card-title-sm">
          quiénes van
        </h2>
        <p className="text-entry-meta text-faded">
          {attendees.length === 0
            ? "todavía nadie, ¿partes tú?"
            : attendees.length === 1
              ? "va 1"
              : `van ${attendees.length}`}
        </p>
        {attendees.length > 0 && (
          <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4">
            {attendees.map((attendee) => {
              const mine = attendee.id === me.id;
              const figure = (
                <>
                  <RokiFigure
                    roki={attendee.roki}
                    color={plan.color}
                    size={64}
                    label={mine ? "tu roki" : `el roki de ${attendee.name}`}
                  />
                  <span className="max-w-full truncate text-card-meta">
                    {mine ? "tú" : attendee.name}
                  </span>
                </>
              );
              return (
                <li
                  key={attendee.id}
                  className="flex flex-col items-center gap-1"
                >
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => setDrawing(true)}
                      className="flex flex-col items-center gap-1"
                      aria-label={
                        me.roki ? "redibujar tu roki" : "dibujar tu roki"
                      }
                    >
                      {figure}
                    </button>
                  ) : (
                    figure
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {attendees.some((attendee) => attendee.id === me.id) && (
          <p className="mt-4 text-card-meta text-faded">
            {me.roki
              ? "toca tu roki para redibujarlo"
              : "toca tu roki para dibujarlo"}
          </p>
        )}
      </section>

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
