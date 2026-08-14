import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  availableSlugFor,
  createEntry,
  listAllEntries,
} from "@/lib/logbook/queries";
import { revalidateLogbook } from "@/lib/logbook/revalidate";
import { createEntrySchema, firstErrorMessage } from "@/lib/schemas/logbook";

/** Listado del panel: todas las notas, borradores incluidos. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ entries: await listAllEntries() });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener las notas." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  const { slug, ...fields } = parsed.data;

  try {
    // Sin slug explícito se deriva del título. Puede quedar vacío si el título
    // no tiene ni una letra ni un número —por ejemplo, solo emojis—, y en ese
    // caso hay que pedirlo en vez de guardar una nota sin URL.
    const finalSlug = slug ?? (await availableSlugFor(fields.title));
    if (finalSlug === "") {
      return NextResponse.json(
        { error: "No se pudo derivar un slug del título. Escribe uno." },
        { status: 400 },
      );
    }

    const entry = await createEntry({ ...fields, slug: finalSlug });

    // Después del insert y antes de responder: si se revalidara antes, se
    // invalidaría el caché por una nota que todavía puede fallar al guardarse.
    revalidateLogbook(entry.slug);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    // El índice único de `slug` es la última barrera contra un duplicado, y
    // devolver 500 escondería que el problema lo puede arreglar quien escribe.
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Ya existe una nota con ese slug." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Error al guardar la nota." },
      { status: 500 },
    );
  }
}
