import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { idSchema, jsonError } from "@/lib/birthday/http";
import { saveRoki } from "@/lib/birthday/queries";

type Params = { params: Promise<{ id: string }> };

/**
 * Borra el roki de alguien (soporte: un dibujo que no va). Vuelve al roki
 * genérico y la próxima vez que diga voy se le pide dibujar de nuevo.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  try {
    if (!(await saveRoki(id, null))) {
      return jsonError("No existe ese invitado.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se pudo borrar el roki.", 500);
  }
}
