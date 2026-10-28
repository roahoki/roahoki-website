import { type NextRequest, NextResponse } from "next/server";
import { eventBySlug, hasPassed } from "@/lib/birthday/events";
import { jsonError, readJson } from "@/lib/birthday/http";
import { getGuestByToken, setRsvp } from "@/lib/birthday/queries";
import { firstErrorMessage, rsvpInputSchema } from "@/lib/schemas/birthday";

/**
 * El invitado dice voy o no voy. Público: el token es la credencial.
 *
 * Un plan al que no está invitado responde 404 y no 403: para ese invitado el
 * plan no existe, y la respuesta no debería contarle lo contrario.
 */
export async function POST(req: NextRequest) {
  const parsed = rsvpInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);
  const { token, event, status } = parsed.data;

  // Un plan que ya pasó no se responde: la pila queda de recuerdo.
  if (hasPassed(eventBySlug(event))) {
    return jsonError("Ese plan ya pasó.", 409);
  }

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return jsonError("Ese link no existe.", 404);

    const result = await setRsvp(guest.id, event, status);
    if (result !== "saved") return jsonError("Ese plan no existe.", 404);
    return NextResponse.json({ status });
  } catch {
    return jsonError("No se guardó, inténtalo otra vez o escríbeme.", 500);
  }
}
