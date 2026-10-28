import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { idSchema, jsonError, readJson } from "@/lib/birthday/http";
import { setRsvp } from "@/lib/birthday/queries";
import { adminRsvpSchema, firstErrorMessage } from "@/lib/schemas/birthday";

type Params = { params: Promise<{ id: string }> };

/**
 * Soporte: Joaquín corrige la respuesta de alguien que le escribió que se
 * anotó mal. `status: null` la vuelve a "sin responder".
 *
 * Pasa por la misma `setRsvp` que usa el invitado, así que tampoco desde acá se
 * puede responder un plan al que no está invitado: primero hay que invitarlo.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  const parsed = adminRsvpSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    const result = await setRsvp(id, parsed.data.event, parsed.data.status);
    if (result === "not_found")
      return jsonError("No existe ese invitado.", 404);
    if (result === "not_invited") {
      return jsonError("No está invitado a ese plan.", 409);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("No se pudo guardar la respuesta.", 500);
  }
}
