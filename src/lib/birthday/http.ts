import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Lo que repiten todos los route handlers del cumpleaños: leer el cuerpo y
 * responder errores con el mismo formato que el resto de la API
 * (`{ error: string }`).
 */

export const idSchema = z.string().uuid("Id inválido.");

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** El cuerpo como JSON, o `undefined` si no lo es. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
