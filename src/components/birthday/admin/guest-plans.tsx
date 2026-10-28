"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import { BIRTHDAY_EVENTS, type EventSlug } from "@/lib/birthday/events";
import { formatDay } from "@/lib/birthday/format";
import type { GuestRsvps } from "@/lib/birthday/queries";
import { request } from "./request";

type Choice = RsvpStatus | null;

const CHOICES: { value: Choice; label: string }[] = [
  { value: "going", label: "va" },
  { value: null, label: "sin resp." },
  { value: "not_going", label: "no va" },
];

/**
 * Los planes en la ficha de un invitado: la casilla lo invita o lo desinvita, y
 * la píldora corrige su respuesta cuando escribe que se anotó mal.
 *
 * Optimista, como los contadores de stats: la pantalla cambia al tocar y se
 * revierte si la API dice que no.
 */
export function GuestPlans({
  guest,
  initialRsvps,
}: {
  guest: {
    id: string;
    name: string;
    phone: string | null;
    personalMessage: string | null;
    invitedEvents: EventSlug[];
  };
  initialRsvps: GuestRsvps;
}) {
  const [invited, setInvited] = useState(guest.invitedEvents);
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [error, setError] = useState<string | null>(null);

  async function toggleInvite(slug: EventSlug) {
    const next = invited.includes(slug)
      ? invited.filter((event) => event !== slug)
      : [...invited, slug];
    if (next.length === 0) {
      setError("Tiene que quedar invitado a algún plan.");
      return;
    }
    const before = { invited, rsvps };
    setInvited(next);
    // Quitar un plan borra su respuesta en la base; se refleja altiro.
    if (!next.includes(slug)) {
      setRsvps(({ [slug]: _removed, ...rest }) => rest);
    }
    setError(null);
    const result = await request(
      `/api/admin/birthday/guests/${guest.id}`,
      "PATCH",
      {
        name: guest.name,
        phone: guest.phone ?? "",
        personalMessage: guest.personalMessage ?? "",
        invitedEvents: next,
      },
    );
    if (!result.ok) {
      setInvited(before.invited);
      setRsvps(before.rsvps);
      setError(result.error);
    }
  }

  async function answer(slug: EventSlug, status: Choice) {
    const before = rsvps;
    setRsvps(({ [slug]: _old, ...rest }) =>
      status ? { ...rest, [slug]: status } : rest,
    );
    setError(null);
    const result = await request(
      `/api/admin/birthday/guests/${guest.id}/rsvps`,
      "PUT",
      { event: slug, status },
    );
    if (!result.ok) {
      setRsvps(before);
      setError(result.error);
    }
  }

  return (
    <section aria-labelledby="sus-planes">
      <h2 id="sus-planes" className="text-entry-meta text-faded">
        sus planes
      </h2>
      <ul>
        {BIRTHDAY_EVENTS.map((plan) => {
          const on = invited.includes(plan.slug);
          const current = rsvps[plan.slug] ?? null;
          return (
            <li
              key={plan.slug}
              className="flex items-center gap-2.5 border-b border-rule py-3 last:border-b-0"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => toggleInvite(plan.slug)}
                />
                <span
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px]"
                  style={
                    on
                      ? { backgroundColor: plan.color, borderColor: plan.color }
                      : { borderColor: plan.color }
                  }
                >
                  {on && <Check className="size-4 text-paper" aria-hidden />}
                </span>
                <span className="flex flex-col">
                  <span
                    className={`text-card-title-sm ${on ? "text-ink" : "text-faded"}`}
                  >
                    {plan.title}
                  </span>
                  <span className="text-card-meta text-faded">
                    {formatDay(plan.startsAt)}
                    {on ? "" : " · no invitado"}
                  </span>
                </span>
              </label>

              {on && (
                <div
                  role="radiogroup"
                  aria-label={`respuesta al ${plan.title}`}
                  className="flex overflow-hidden rounded-full border-[1.5px]"
                  style={{ borderColor: plan.color }}
                >
                  {CHOICES.map((choice) => {
                    const selected = current === choice.value;
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: una píldora de tres opciones, no tres radios sueltos
                      <button
                        key={choice.label}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => answer(plan.slug, choice.value)}
                        className="px-2.5 py-1.5 text-card-meta"
                        style={
                          selected
                            ? {
                                backgroundColor: plan.color,
                                color: "var(--paper)",
                              }
                            : { color: plan.color }
                        }
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-card-meta text-faded">
        La casilla invita o desinvita. La respuesta la corriges tú si te escribe
        que se anotó mal.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-entry-meta text-leaf">
          {error}
        </p>
      )}
    </section>
  );
}
