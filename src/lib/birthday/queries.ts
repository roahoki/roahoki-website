import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  type BirthdayGuest,
  birthdayEventAlbums,
  birthdayGuests,
  birthdayRsvps,
  type RsvpStatus,
} from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import type { GuestInput } from "@/lib/schemas/birthday";
import type { EventSlug } from "./events";
import type { Roki } from "./roki";
import { generateToken } from "./token";

/**
 * Todo el acceso a las tablas del cumpleaños pasa por acá.
 *
 * Este cliente conecta como dueño de la base y **se salta RLS** (ver
 * `src/db/index.ts`). Las reglas que importan las sostiene este archivo: un
 * invitado solo responde los planes a los que está invitado, y quitarle un plan
 * borra su respuesta a ese plan.
 */

/** Las respuestas de un invitado. Un plan sin clave es "sin responder". */
export type GuestRsvps = Partial<Record<EventSlug, RsvpStatus>>;

export type GuestWithRsvps = BirthdayGuest & { rsvps: GuestRsvps };

/** Quien aparece en la pila de un plan. */
export type Attendee = Pick<BirthdayGuest, "id" | "name" | "roki">;

// ---------------------------------------------------------------------------
// Invitados

/**
 * Crea un invitado con un token nuevo.
 *
 * Reintenta si el token choca con uno existente. Con ~71 bits no va a pasar,
 * pero el costo de cubrirlo es un `for` y el de no hacerlo sería un 500 sin
 * explicación al crear a alguien.
 */
export async function createGuest(input: GuestInput): Promise<BirthdayGuest> {
  for (let attempt = 0; ; attempt++) {
    try {
      const [guest] = await getDb()
        .insert(birthdayGuests)
        .values({
          name: input.name,
          phone: input.phone ?? null,
          personalMessage: input.personalMessage ?? null,
          invitedEvents: input.invitedEvents,
          token: generateToken(),
        })
        .returning();
      return guest;
    } catch (error) {
      if (attempt < 3 && isTokenCollision(error)) continue;
      throw error;
    }
  }
}

/**
 * Edita nombre, teléfono, mensaje y planes.
 *
 * Si se le quita un plan, su respuesta a ese plan se borra en la misma
 * transacción. Si quedara, el invitado seguiría contando en la pila de un plan
 * que ya no puede ver.
 */
export async function updateGuest(
  id: string,
  input: GuestInput,
): Promise<BirthdayGuest | undefined> {
  return getDb().transaction(async (tx) => {
    const [guest] = await tx
      .update(birthdayGuests)
      .set({
        name: input.name,
        phone: input.phone ?? null,
        personalMessage: input.personalMessage ?? null,
        invitedEvents: input.invitedEvents,
      })
      .where(eq(birthdayGuests.id, id))
      .returning();
    if (!guest) return undefined;

    await tx
      .delete(birthdayRsvps)
      .where(
        and(
          eq(birthdayRsvps.guestId, id),
          notInArray(birthdayRsvps.eventSlug, guest.invitedEvents),
        ),
      );
    return guest;
  });
}

/** Borra al invitado. Sus respuestas se van con él (`on delete cascade`). */
export async function deleteGuest(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(birthdayGuests)
    .where(eq(birthdayGuests.id, id))
    .returning({ id: birthdayGuests.id });
  return deleted.length > 0;
}

/**
 * Le da un token nuevo. El anterior deja de funcionar en el acto: es lo que se
 * hace cuando un link se filtró. Sus respuestas y su roki se mantienen.
 */
export async function regenerateToken(
  id: string,
): Promise<BirthdayGuest | undefined> {
  for (let attempt = 0; ; attempt++) {
    try {
      const [guest] = await getDb()
        .update(birthdayGuests)
        .set({ token: generateToken() })
        .where(eq(birthdayGuests.id, id))
        .returning();
      return guest;
    } catch (error) {
      if (attempt < 3 && isTokenCollision(error)) continue;
      throw error;
    }
  }
}

export async function getGuestById(
  id: string,
): Promise<BirthdayGuest | undefined> {
  const [guest] = await getDb()
    .select()
    .from(birthdayGuests)
    .where(eq(birthdayGuests.id, id));
  return guest;
}

export async function getGuestByToken(
  token: string,
): Promise<BirthdayGuest | undefined> {
  const [guest] = await getDb()
    .select()
    .from(birthdayGuests)
    .where(eq(birthdayGuests.token, token));
  return guest;
}

/**
 * Anota que el invitado abrió su link: la primera vez, y la última.
 *
 * `coalesce` y no un `select` previo: la primera visita queda fija aunque dos
 * pestañas abran el link a la vez.
 */
export async function recordVisit(
  id: string,
  now: Date = new Date(),
): Promise<void> {
  const at = now.toISOString();
  await getDb()
    .update(birthdayGuests)
    .set({
      firstSeenAt: sql`coalesce(${birthdayGuests.firstSeenAt}, ${at})`,
      lastSeenAt: at,
    })
    .where(eq(birthdayGuests.id, id));
}

/** Raspó su invitación. Solo cuenta la primera vez. */
export async function markScratched(
  token: string,
  now: Date = new Date(),
): Promise<boolean> {
  const updated = await getDb()
    .update(birthdayGuests)
    .set({
      scratchedAt: sql`coalesce(${birthdayGuests.scratchedAt}, ${now.toISOString()})`,
    })
    .where(eq(birthdayGuests.token, token))
    .returning({ id: birthdayGuests.id });
  return updated.length > 0;
}

/** Guarda su roki, o lo borra (`null`) para que vuelva al genérico. */
export async function saveRoki(
  id: string,
  roki: Roki | null,
): Promise<boolean> {
  const updated = await getDb()
    .update(birthdayGuests)
    .set({ roki })
    .where(eq(birthdayGuests.id, id))
    .returning({ id: birthdayGuests.id });
  return updated.length > 0;
}

/**
 * Todos los invitados con sus respuestas, para el panel. Ordenados por nombre;
 * el panel agrupa entre "sin responder" y "ya respondieron".
 *
 * Dos consultas y no un join: un join repetiría cada invitado una vez por
 * respuesta, y armarlo de vuelta en JS es más código que juntar dos listas.
 */
export async function listGuests(): Promise<GuestWithRsvps[]> {
  const db = getDb();
  const [guests, rsvps] = await Promise.all([
    db.select().from(birthdayGuests).orderBy(asc(birthdayGuests.name)),
    db.select().from(birthdayRsvps),
  ]);

  const byGuest = new Map<string, GuestRsvps>();
  for (const rsvp of rsvps) {
    const current = byGuest.get(rsvp.guestId) ?? {};
    current[rsvp.eventSlug] = rsvp.status;
    byGuest.set(rsvp.guestId, current);
  }
  return guests.map((guest) => ({
    ...guest,
    rsvps: byGuest.get(guest.id) ?? {},
  }));
}

// ---------------------------------------------------------------------------
// Respuestas

export async function rsvpsOf(guestId: string): Promise<GuestRsvps> {
  const rows = await getDb()
    .select()
    .from(birthdayRsvps)
    .where(eq(birthdayRsvps.guestId, guestId));
  return Object.fromEntries(rows.map((row) => [row.eventSlug, row.status]));
}

export type SetRsvpResult = "saved" | "not_invited" | "not_found";

/**
 * Responde un plan, o borra la respuesta (`null`, solo desde el panel).
 *
 * Rechaza un plan que no está en `invited_events`. Esta es **la** barrera: sin
 * ella, cualquiera podría anotarse al cóctel armando la petición a mano, porque
 * el token no dice nada de qué planes tiene permitidos.
 *
 * El chequeo y la escritura van en la misma transacción, con el invitado
 * bloqueado (`for update`), para que quitarle el plan desde el panel no se
 * cruce con su respuesta.
 */
export async function setRsvp(
  guestId: string,
  event: EventSlug,
  status: RsvpStatus | null,
  now: Date = new Date(),
): Promise<SetRsvpResult> {
  return getDb().transaction(async (tx) => {
    const [guest] = await tx
      .select({ invitedEvents: birthdayGuests.invitedEvents })
      .from(birthdayGuests)
      .where(eq(birthdayGuests.id, guestId))
      .for("update");
    if (!guest) return "not_found";
    if (!guest.invitedEvents.includes(event)) return "not_invited";

    if (status === null) {
      await tx
        .delete(birthdayRsvps)
        .where(
          and(
            eq(birthdayRsvps.guestId, guestId),
            eq(birthdayRsvps.eventSlug, event),
          ),
        );
      return "saved";
    }

    const updatedAt = now.toISOString();
    await tx
      .insert(birthdayRsvps)
      .values({ guestId, eventSlug: event, status, updatedAt })
      .onConflictDoUpdate({
        target: [birthdayRsvps.guestId, birthdayRsvps.eventSlug],
        set: { status, updatedAt },
      });
    return "saved";
  });
}

/**
 * Quienes van a un plan, en el orden en que confirmaron: el último que dijo voy
 * es el último que cae a la pila.
 */
export async function attendeesOf(event: EventSlug): Promise<Attendee[]> {
  return getDb()
    .select({
      id: birthdayGuests.id,
      name: birthdayGuests.name,
      roki: birthdayGuests.roki,
    })
    .from(birthdayRsvps)
    .innerJoin(birthdayGuests, eq(birthdayGuests.id, birthdayRsvps.guestId))
    .where(
      and(
        eq(birthdayRsvps.eventSlug, event),
        eq(birthdayRsvps.status, "going"),
        // Si le quitaron el plan después de confirmar, ya no está en la pila.
        sql`${event} = ANY (${birthdayGuests.invitedEvents})`,
      ),
    )
    .orderBy(asc(birthdayRsvps.updatedAt));
}

// ---------------------------------------------------------------------------
// Álbumes

export async function albums(): Promise<Partial<Record<EventSlug, string>>> {
  const rows = await getDb().select().from(birthdayEventAlbums);
  return Object.fromEntries(rows.map((row) => [row.eventSlug, row.url]));
}

/** Pega o reemplaza el álbum de un plan; `null` lo quita. */
export async function setAlbum(
  event: EventSlug,
  url: string | null,
  now: Date = new Date(),
): Promise<void> {
  const db = getDb();
  if (url === null) {
    await db
      .delete(birthdayEventAlbums)
      .where(eq(birthdayEventAlbums.eventSlug, event));
    return;
  }
  const updatedAt = now.toISOString();
  await db
    .insert(birthdayEventAlbums)
    .values({ eventSlug: event, url, updatedAt })
    .onConflictDoUpdate({
      target: birthdayEventAlbums.eventSlug,
      set: { url, updatedAt },
    });
}

/**
 * Drizzle envuelve el error de Postgres en uno propio y deja el original en
 * `cause`; se miran los dos.
 */
function isTokenCollision(error: unknown): boolean {
  const cause = (error as { cause?: unknown } | null)?.cause;
  return (
    isUniqueViolation(error, "birthday_guests_token_key") ||
    isUniqueViolation(cause, "birthday_guests_token_key")
  );
}
