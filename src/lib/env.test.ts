import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminPassword,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./env";

/**
 * El punto de `src/lib/env.ts` es fallar temprano y con un mensaje útil, en vez
 * de dejar que un `undefined` viaje hasta el fondo del stack (que es lo que
 * hacía el patrón `process.env.FOO!`).
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

const readers = [
  ["supabaseUrl", supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"],
  ["supabaseAnonKey", supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  [
    "supabaseServiceRoleKey",
    supabaseServiceRoleKey,
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  ["adminPassword", adminPassword, "ADMIN_PASSWORD"],
] as const;

describe("lectura de variables de entorno", () => {
  describe.each(readers)("%s", (_name, read, varName) => {
    it("devuelve el valor cuando está definido", () => {
      vi.stubEnv(varName, "un-valor");
      expect(read()).toBe("un-valor");
    });

    it("lanza nombrando la variable que falta", () => {
      vi.stubEnv(varName, "");
      expect(read).toThrowError(new RegExp(varName));
    });

    // Una cadena vacía es tan inservible como `undefined`, y es el caso real:
    // un `.env` con `FOO=` pasa como definido pero no sirve para nada.
    it("trata la cadena vacía como ausente", () => {
      vi.stubEnv(varName, "");
      expect(read).toThrow();
    });
  });

  it("menciona .env.example para saber qué completar", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(adminPassword).toThrowError(/\.env\.example/);
  });
});
