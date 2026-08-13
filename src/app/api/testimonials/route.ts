import { type NextRequest, NextResponse } from "next/server";
import {
  createTestimonialSchema,
  firstErrorMessage,
} from "@/lib/schemas/testimonial";
import { createTestimonial } from "@/lib/testimonials/queries";

/**
 * Alta pública de un testimonio. Nace siempre en `pending`: el estado lo decide
 * `createTestimonial`, no el cuerpo del request.
 *
 * La validación vive en `@/lib/schemas/testimonial`, compartida con el
 * formulario. El esquema además normaliza —recorta, pasa los vacíos a `null`,
 * completa el esquema de las URLs— y entrega la fila ya en camelCase, así que
 * acá no queda ninguna transformación a mano.
 */
export async function POST(req: NextRequest) {
  // `req.json()` tira si el cuerpo no es JSON válido, y sin este try el
  // resultado era un 500 por un error del cliente.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = createTestimonialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  try {
    await createTestimonial(parsed.data);
  } catch {
    return NextResponse.json(
      { error: "Error al guardar el testimonio." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
