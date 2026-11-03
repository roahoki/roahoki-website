import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, readJson } from "@/lib/birthday/http";
import { addWhatsappRsvp } from "@/lib/birthday/queries";
import {
  firstErrorMessage,
  whatsappRsvpInputSchema,
} from "@/lib/schemas/birthday";

/** Anota un grupo que confirmó por WhatsApp. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = whatsappRsvpInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    const created = await addWhatsappRsvp(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return jsonError("No se pudo anotar.", 500);
  }
}
