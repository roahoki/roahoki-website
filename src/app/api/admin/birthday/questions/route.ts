import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, readJson } from "@/lib/birthday/http";
import { createFaq } from "@/lib/birthday/queries";
import { faqInputSchema, firstErrorMessage } from "@/lib/schemas/birthday";

/** Publica una duda frecuente en un plan, con su respuesta. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = faqInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    const { event, question, answer } = parsed.data;
    await createFaq(event, question, answer);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return jsonError("No se pudo publicar la duda.", 500);
  }
}
