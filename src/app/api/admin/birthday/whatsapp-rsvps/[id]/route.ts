import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { idSchema, jsonError, readJson } from "@/lib/birthday/http";
import {
  deleteWhatsappRsvp,
  setWhatsappPartySize,
} from "@/lib/birthday/queries";
import {
  firstErrorMessage,
  partySizeInputSchema,
} from "@/lib/schemas/birthday";

type Params = { params: Promise<{ id: string }> };

/** Corrige cuántos vienen en un grupo. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  const parsed = partySizeInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    if (!(await setWhatsappPartySize(id, parsed.data.partySize))) {
      return jsonError("Ese grupo ya no está anotado.", 404);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("No se pudo guardar.", 500);
  }
}

/** Saca a un grupo: se bajó o se anotó dos veces. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  try {
    if (!(await deleteWhatsappRsvp(id))) {
      return jsonError("Ese grupo ya no está anotado.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se pudo borrar.", 500);
  }
}
