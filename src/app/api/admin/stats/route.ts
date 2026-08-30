import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  counterEventSchema,
  deltaFor,
  firstErrorMessage,
} from "@/lib/schemas/stats";
import { currentWeekTotals, recordEvent } from "@/lib/stats/queries";
import { revalidateStats } from "@/lib/stats/revalidate";

/**
 * Registra un tap del contador.
 *
 * Responde con el total de la semana ya recalculado, y no solo con el evento
 * guardado. El panel pinta el número de forma optimista apenas se toca el
 * botón —en el gimnasio, con señal mala, esperar la respuesta se siente
 * roto—, así que necesita algo con qué corregirse: sin el total, una respuesta
 * perdida dejaría la pantalla mostrando un número que la base nunca vio.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = counterEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  const { exercise, direction } = parsed.data;

  try {
    const event = await recordEvent(exercise, deltaFor(direction));

    // `recordEvent` devuelve `undefined` cuando el "−" dejaría la semana en
    // negativo. Es un rechazo con causa, no un error: 409 y un mensaje que
    // explica por qué, en vez de un 500 que sugiere que se rompió algo.
    if (!event) {
      return NextResponse.json(
        { error: "El contador ya está en cero." },
        { status: 409 },
      );
    }

    // Después del insert y antes de responder: revalidar antes invalidaría el
    // caché por un evento que todavía puede fallar al guardarse.
    revalidateStats();

    const totals = await currentWeekTotals();

    return NextResponse.json(
      { event, total: totals[exercise] },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Error al guardar el registro." },
      { status: 500 },
    );
  }
}
