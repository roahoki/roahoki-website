import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  // La cookie vieja guardaba la contraseña en claro. Se borra también acá para
  // que cerrar sesión una vez la saque del navegador de quien ya la tenía.
  res.cookies.set("admin_token", "", { maxAge: 0, path: "/" });
  return res;
}
