import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { SESSION_HINT_COOKIE } from "@/lib/auth/session-hint";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";

beforeEach(() => {
  vi.stubEnv("ADMIN_PASSWORD", "secreto");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function loginRequest(password: string) {
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/**
 * La pista del botón flotante (`SESSION_HINT_COOKIE`) acompaña a la sesión:
 * nace y muere con ella, y es la única de las dos que el navegador puede leer.
 */
describe("cookies de sesión", () => {
  it("el login deja la sesión cerrada al navegador y la pista abierta", async () => {
    const res = await login(loginRequest("secreto"));

    expect(res.cookies.get(SESSION_COOKIE)?.httpOnly).toBe(true);
    expect(res.cookies.get(SESSION_HINT_COOKIE)).toMatchObject({
      value: "1",
      httpOnly: false,
      path: "/",
    });
    expect(res.cookies.get(SESSION_HINT_COOKIE)?.maxAge).toBe(
      res.cookies.get(SESSION_COOKIE)?.maxAge,
    );
  });

  it("con la contraseña equivocada no deja ninguna", async () => {
    const res = await login(loginRequest("otra"));

    expect(res.status).toBe(401);
    expect(res.cookies.get(SESSION_HINT_COOKIE)).toBeUndefined();
  });

  it("el logout borra las dos", async () => {
    const res = await logout();

    expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
    expect(res.cookies.get(SESSION_HINT_COOKIE)?.maxAge).toBe(0);
  });
});
