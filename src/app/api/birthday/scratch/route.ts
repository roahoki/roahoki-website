import { type NextRequest, NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/birthday/http";
import { markScratched } from "@/lib/birthday/queries";
import { scratchInputSchema } from "@/lib/schemas/birthday";

/** El invitado raspó su invitación: la próxima vez entra directo. */
export async function POST(req: NextRequest) {
  const parsed = scratchInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError("Ese link no existe.", 404);

  try {
    if (!(await markScratched(parsed.data.token))) {
      return jsonError("Ese link no existe.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se pudo guardar.", 500);
  }
}
