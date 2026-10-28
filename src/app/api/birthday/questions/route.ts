import { type NextRequest, NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/birthday/http";
import {
  askQuestion,
  getGuestByToken,
  MAX_PENDING_QUESTIONS,
} from "@/lib/birthday/queries";
import { firstErrorMessage, questionInputSchema } from "@/lib/schemas/birthday";

/**
 * El invitado deja una duda en un plan. Público: el token es la credencial.
 *
 * Igual que con las respuestas, un plan al que no está invitado responde 404:
 * para ese invitado el plan no existe. La duda queda esperando hasta que
 * Joaquín la responde; recién ahí la ven los demás.
 */
export async function POST(req: NextRequest) {
  const parsed = questionInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);
  const { token, event, question } = parsed.data;

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return jsonError("Ese link no existe.", 404);
    if (!guest.invitedEvents.includes(event)) {
      return jsonError("Ese plan no existe.", 404);
    }

    const result = await askQuestion(guest.id, event, question);
    if (result.status === "too_many") {
      return jsonError(
        `Ya tienes ${MAX_PENDING_QUESTIONS} dudas esperando respuesta en este plan.`,
        429,
      );
    }
    return NextResponse.json({ question: result.question }, { status: 201 });
  } catch {
    return jsonError("No se envió, inténtalo otra vez o escríbeme.", 500);
  }
}
