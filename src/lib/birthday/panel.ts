import type { BirthdayGuest, RsvpStatus } from "@/db/schema";
import { BIRTHDAY_EVENTS, type EventSlug } from "./events";
import type { GuestWithRsvps } from "./queries";

/**
 * Las cuentas del panel, separadas de la vista para poder probarlas.
 *
 * Todo cuenta **solo a los invitados de cada plan**: alguien que no está
 * invitado al cóctel no es "sin responder" del cóctel.
 */

/** Lo que muestra un puntito: va, no va, sin responder o no invitado. */
export type DotState = RsvpStatus | "pending" | "not_invited";

export function dotState(guest: GuestWithRsvps, event: EventSlug): DotState {
  if (!guest.invitedEvents.includes(event)) return "not_invited";
  return guest.rsvps[event] ?? "pending";
}

/** Cuántos planes le quedan por responder. */
export function pendingCount(guest: GuestWithRsvps): number {
  return guest.invitedEvents.filter((event) => !guest.rsvps[event]).length;
}

export type EventSummary = {
  slug: EventSlug;
  going: number;
  notGoing: number;
  pending: number;
};

export function summarize(guests: GuestWithRsvps[]): EventSummary[] {
  return BIRTHDAY_EVENTS.map(({ slug }) => {
    const summary: EventSummary = { slug, going: 0, notGoing: 0, pending: 0 };
    for (const guest of guests) {
      const state = dotState(guest, slug);
      if (state === "going") summary.going++;
      else if (state === "not_going") summary.notGoing++;
      else if (state === "pending") summary.pending++;
    }
    return summary;
  });
}

/** Los dos grupos de la lista: primero a quien hay que perseguir. */
export function splitByPending(guests: GuestWithRsvps[]) {
  return {
    pending: guests.filter((guest) => pendingCount(guest) > 0),
    done: guests.filter((guest) => pendingCount(guest) === 0),
  };
}

/**
 * En qué va con su link, en una línea: lo primero que hay que saber para
 * decidir si escribirle.
 */
export function visitLabel(
  guest: Pick<BirthdayGuest, "firstSeenAt" | "scratchedAt">,
): "no ha abierto el link" | "abrió, sin raspar" | "raspó" {
  if (!guest.firstSeenAt) return "no ha abierto el link";
  if (!guest.scratchedAt) return "abrió, sin raspar";
  return "raspó";
}

/** "van" o "va": el contador del panel no dice "1 van". */
export function goingLabel(count: number): string {
  return count === 1 ? "1 va" : `${count} van`;
}
