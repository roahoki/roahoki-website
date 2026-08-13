import { type NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  deleteTestimonialSchema,
  firstErrorMessage,
  moderateTestimonialSchema,
} from "@/lib/schemas/testimonial";
import {
  deleteTestimonial,
  listAllTestimonials,
  updateTestimonialStatus,
} from "@/lib/testimonials/queries";

/**
 * Lee y valida el cuerpo con el esquema dado.
 *
 * Devuelve la respuesta de error ya armada en vez de tirar, para que cada
 * handler decida con un `if` y no con un try/catch. Un cuerpo que no es JSON y
 * uno que no cumple el esquema son ambos culpa del cliente: los dos dan 400.
 */
async function parseBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<{ data: z.infer<S> } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: firstErrorMessage(parsed.error) },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ testimonials: await listAllTestimonials() });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener testimonios." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, moderateTestimonialSchema);
  if ("error" in parsed) return parsed.error;
  const { id, status } = parsed.data;

  try {
    const updated = await updateTestimonialStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { error: "No existe ese testimonio." },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(req, deleteTestimonialSchema);
  if ("error" in parsed) return parsed.error;
  const { id } = parsed.data;

  try {
    if (!(await deleteTestimonial(id))) {
      return NextResponse.json(
        { error: "No existe ese testimonio." },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
