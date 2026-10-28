import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, readJson } from "@/lib/birthday/http";
import { setAlbum } from "@/lib/birthday/queries";
import { albumInputSchema, firstErrorMessage } from "@/lib/schemas/birthday";

/** Pega, cambia o quita (con url vacía) el álbum de fotos de un plan. */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = albumInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    await setAlbum(parsed.data.event, parsed.data.url);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("No se pudo guardar el álbum.", 500);
  }
}
