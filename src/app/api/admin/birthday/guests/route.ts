import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, readJson } from "@/lib/birthday/http";
import { createGuest } from "@/lib/birthday/queries";
import { firstErrorMessage, guestInputSchema } from "@/lib/schemas/birthday";

/** Crea un invitado y le arma su link. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = guestInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    const guest = await createGuest(parsed.data);
    return NextResponse.json({ guest }, { status: 201 });
  } catch {
    return jsonError("No se pudo crear el invitado.", 500);
  }
}
