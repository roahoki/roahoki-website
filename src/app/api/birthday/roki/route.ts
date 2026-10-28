import { type NextRequest, NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/birthday/http";
import { getGuestByToken, saveRoki } from "@/lib/birthday/queries";
import { firstErrorMessage, rokiInputSchema } from "@/lib/schemas/birthday";

/**
 * Guarda el roki que dibujó el invitado (o lo reemplaza si lo redibuja).
 * Público: el token es la credencial. El esquema acota cuántos trazos y puntos
 * entran, para que esto no sirva para llenar la base.
 */
export async function POST(req: NextRequest) {
  const parsed = rokiInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    const guest = await getGuestByToken(parsed.data.token);
    if (!guest) return jsonError("Ese link no existe.", 404);
    await saveRoki(guest.id, parsed.data.roki);
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se guardó tu roki, inténtalo otra vez.", 500);
  }
}
