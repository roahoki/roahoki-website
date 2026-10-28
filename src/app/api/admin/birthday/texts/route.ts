import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, readJson } from "@/lib/birthday/http";
import { setEventTexts } from "@/lib/birthday/queries";
import {
  eventTextsInputSchema,
  firstErrorMessage,
} from "@/lib/schemas/birthday";

/** Guarda los textos de un plan, o vuelve a los de código con `texts: null`. */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = eventTextsInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    await setEventTexts(parsed.data.event, parsed.data.texts);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("No se pudieron guardar los textos.", 500);
  }
}
