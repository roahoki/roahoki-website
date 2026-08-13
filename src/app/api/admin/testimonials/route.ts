import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { adminPassword } from "@/lib/env";
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

/**
 * Antes esto comparaba contra `process.env.ADMIN_PASSWORD` directo, y ahí había
 * un agujero: sin la variable definida, la cookie ausente también da
 * `undefined`, y `undefined === undefined` es true. Es decir, un deploy sin
 * `ADMIN_PASSWORD` dejaba la API de moderación abierta a cualquiera.
 *
 * `adminPassword()` revienta si la variable falta, así que el caso degenerado
 * pasa a ser un 500 ruidoso en vez de un acceso concedido.
 */
async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return Boolean(token) && token === adminPassword();
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

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
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

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
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

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
