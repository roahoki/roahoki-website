import { type NextRequest, NextResponse } from "next/server"
import { supabaseAnon } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, message, image_url, linkedin_url, github_username, email } = body

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 })
  }
  if (!message || message.trim().length < 20) {
    return NextResponse.json({ error: "El mensaje debe tener al menos 20 caracteres." }, { status: 400 })
  }
  if (!linkedin_url && !github_username && !email) {
    return NextResponse.json({ error: "Debes ingresar al menos un medio de contacto." }, { status: 400 })
  }

  const { error } = await supabaseAnon()
    .from("testimonials")
    .insert({
      name: name.trim(),
      message: message.trim(),
      image_url: image_url || null,
      linkedin_url: linkedin_url?.trim() || null,
      github_username: github_username?.trim() || null,
      email: email?.trim() || null,
    })

  if (error) {
    return NextResponse.json({ error: "Error al guardar el testimonio." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
