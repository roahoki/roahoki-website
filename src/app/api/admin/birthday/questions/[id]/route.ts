import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { idSchema, jsonError, readJson } from "@/lib/birthday/http";
import { answerQuestion, deleteQuestion } from "@/lib/birthday/queries";
import { answerInputSchema, firstErrorMessage } from "@/lib/schemas/birthday";

type Params = { params: Promise<{ id: string }> };

/** Responde una duda, o corrige la respuesta. Al responderla la ven todos. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  const parsed = answerInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstErrorMessage(parsed.error), 400);

  try {
    if (!(await answerQuestion(id, parsed.data.answer))) {
      return jsonError("Esa duda ya no existe.", 404);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("No se pudo guardar la respuesta.", 500);
  }
}

/** Borra una duda: una repetida, una broma o una que ya no aplica. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Id inválido.", 400);

  try {
    if (!(await deleteQuestion(id))) {
      return jsonError("Esa duda ya no existe.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return jsonError("No se pudo borrar.", 500);
  }
}
