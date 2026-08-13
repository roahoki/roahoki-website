import { type NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { adminPassword } from "@/lib/env";

export async function POST(req: NextRequest) {
  let password: unknown;
  try {
    password = (await req.json()).password;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (typeof password !== "string" || password !== adminPassword()) {
    return NextResponse.json(
      { error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  // La cookie lleva un token firmado, no la contraseña: verificarlo no exige
  // volver a tener el secreto a mano en cada request, solo la clave de firma.
  res.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(),
    sessionCookieOptions(),
  );
  return res;
}
