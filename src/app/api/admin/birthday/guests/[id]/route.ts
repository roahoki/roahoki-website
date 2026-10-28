import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { idSchema, jsonError, readJson } from "@/lib/birthday/http";
import { deleteGuest, updateGuest } from "@/lib/birthday/queries";
import { firstErrorMessage, guestInputSchema } from "@/lib/schemas/birthday";

type Params = { params: Promise<{ id: string }> };

/**
 * Edita nombre, teléfono, mensaje y planes. Quitar un plan borra la respuesta
 * a ese plan (ver `updateGuest`).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  const parsed = guestInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    const guest = await updateGuest(id, parsed.data);
    if (!guest) return jsonError("No existe ese invitado.", 404);
    return NextResponse.json({ guest });
  } catch {
    return jsonError("No se pudo guardar.", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  try {
    if (!(await deleteGuest(id))) {
      return jsonError("No existe ese invitado.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se pudo eliminar.", 500);
  }
}
