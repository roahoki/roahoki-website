import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import type { TestimonialStatus } from "@/db/schema";
import { adminPassword } from "@/lib/env";
import {
  deleteTestimonial,
  listAllTestimonials,
  updateTestimonialStatus,
} from "@/lib/testimonials/queries";

const VALID_STATUSES: TestimonialStatus[] = ["pending", "approved", "rejected"];

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

  const { id, status } = await req.json();
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

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

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID requerido." }, { status: 400 });
  }

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
