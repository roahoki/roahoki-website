import { type NextRequest, NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/birthday/http";
import { getGuestByToken, recordVisit } from "@/lib/birthday/queries";
import { scratchInputSchema } from "@/lib/schemas/birthday";

/**
 * El invitado abrió su link (ver `VisitBeacon`). Público: el token es la
 * credencial, y lo único que permite es anotar una fecha de visita.
 */
export async function POST(req: NextRequest) {
  const parsed = scratchInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Ese link no existe.", 404);

  try {
    const guest = await getGuestByToken(parsed.data.token);
    if (!guest) return jsonError("Ese link no existe.", 404);
    await recordVisit(guest.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se pudo anotar la visita.", 500);
  }
}
