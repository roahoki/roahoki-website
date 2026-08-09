import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

async function checkAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  return token === process.env.ADMIN_PASSWORD
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin()
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Error al obtener testimonios." }, { status: 500 })
  return NextResponse.json({ testimonials: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const { id, status } = await req.json()
  if (!id || !["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from("testimonials")
    .update({ status })
    .eq("id", id)

  if (error) return NextResponse.json({ error: "Error al actualizar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 })

  const { error } = await supabaseAdmin()
    .from("testimonials")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: "Error al eliminar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
