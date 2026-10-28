import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { idSchema, jsonError } from "@/lib/birthday/http";
import { regenerateToken } from "@/lib/birthday/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * Regenera el link de un invitado: el anterior deja de funcionar en el acto.
 * Es lo que se hace cuando un link se filtró.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  try {
    const guest = await regenerateToken(id);
    if (!guest) return jsonError("No existe ese invitado.", 404);
    return NextResponse.json({ guest });
  } catch {
    return jsonError("No se pudo regenerar el link.", 500);
  }
}
