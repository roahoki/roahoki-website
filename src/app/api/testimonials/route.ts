import { type NextRequest, NextResponse } from "next/server";
import { createTestimonial } from "@/lib/testimonials/queries";

/**
 * Alta pública de un testimonio. Nace siempre en `pending`: el estado lo decide
 * `createTestimonial`, no el cuerpo del request.
 *
 * El formato del cuerpo sigue siendo snake_case porque es el contrato que ya
 * habla el formulario. La validación a mano de acá abajo se reemplaza por un
 * esquema zod compartido en `feat/zod-validation`, la PR siguiente.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, message, image_url, linkedin_url, github_username, email } =
    body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "El nombre debe tener al menos 2 caracteres." },
      { status: 400 },
    );
  }
  if (!message || message.trim().length < 20) {
    return NextResponse.json(
      { error: "El mensaje debe tener al menos 20 caracteres." },
      { status: 400 },
    );
  }
  if (!linkedin_url && !github_username && !email) {
    return NextResponse.json(
      { error: "Debes ingresar al menos un medio de contacto." },
      { status: 400 },
    );
  }

  try {
    await createTestimonial({
      name: name.trim(),
      message: message.trim(),
      imageUrl: image_url || null,
      linkedinUrl: linkedin_url?.trim() || null,
      githubUsername: github_username?.trim() || null,
      email: email?.trim() || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al guardar el testimonio." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
