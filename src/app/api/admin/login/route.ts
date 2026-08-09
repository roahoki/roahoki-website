import { type NextRequest, NextResponse } from "next/server";
import { adminPassword } from "@/lib/env";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = adminPassword();

  if (!password || password !== expected) {
    return NextResponse.json(
      { error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  // TODO: la cookie guarda la password en claro. Se reemplaza por un token
  // firmado con HMAC en la PR `feat/signed-admin-session`.
  res.cookies.set("admin_token", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}
