import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isUniqueViolation } from "@/lib/db-errors";
import { deleteEntry, getEntryById, updateEntry } from "@/lib/logbook/queries";
import { firstErrorMessage, updateEntrySchema } from "@/lib/schemas/logbook";

/**
 * Acciones sobre una nota concreta.
 *
 * El id se valida como uuid antes de tocar la base: sin eso, un id malformado
 * llega hasta Postgres y vuelve como error de driver, o sea un 500 por algo que
 * es culpa del request.
 */
const idSchema = z.string().uuid("Id inválido.");

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  try {
    const entry = await getEntryById(id);
    if (!entry) {
      return NextResponse.json(
        { error: "No existe esa nota." },
        { status: 404 },
      );
    }
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener la nota." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const entry = await updateEntry(id, parsed.data);
    if (!entry) {
      return NextResponse.json(
        { error: "No existe esa nota." },
        { status: 404 },
      );
    }
    return NextResponse.json({ entry });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Ya existe una nota con ese slug." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Error al actualizar la nota." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  try {
    if (!(await deleteEntry(id))) {
      return NextResponse.json(
        { error: "No existe esa nota." },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar la nota." },
      { status: 500 },
    );
  }

  // Las imágenes del cuerpo quedan en el bucket. Borrarlas exigiría parsear el
  // markdown para saber cuáles son solo de esta nota, y una imagen huérfana
  // cuesta menos que borrar por error una que otra nota todavía usa.
  return NextResponse.json({ ok: true });
}
