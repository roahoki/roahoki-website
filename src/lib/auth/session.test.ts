import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  SESSION_TTL_MS,
  sessionCookieOptions,
  verifySessionToken,
} from "./session";

// La clave se lee en cada firma, así que basta con fijar el entorno acá.
const originalPassword = process.env.ADMIN_PASSWORD;
const originalSecret = process.env.ADMIN_SESSION_SECRET;

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "contraseña-de-prueba";
  process.env.ADMIN_SESSION_SECRET = "secreto-de-prueba";
});

afterEach(() => {
  process.env.ADMIN_PASSWORD = originalPassword;
  process.env.ADMIN_SESSION_SECRET = originalSecret;
});

const NOW = 1_700_000_000_000;

describe("createSessionToken", () => {
  it("emite `<expiración>.<firma>`", async () => {
    const token = await createSessionToken(NOW);
    const [expiresAt, signature] = token.split(".");

    expect(expiresAt).toBe(String(NOW + SESSION_TTL_MS));
    expect(signature).toMatch(/^[\w-]+$/);
  });

  // El punto de la PR: la contraseña no sale del servidor.
  it("no contiene la contraseña", async () => {
    const token = await createSessionToken(NOW);

    expect(token).not.toContain("contraseña-de-prueba");
  });

  it("no usa caracteres que rompan una cookie", async () => {
    const token = await createSessionToken(NOW);

    expect(token).not.toMatch(/[+/=;,\s]/);
  });

  it("es determinista para el mismo instante y la misma clave", async () => {
    expect(await createSessionToken(NOW)).toBe(await createSessionToken(NOW));
  });

  it("cambia si cambia el instante", async () => {
    expect(await createSessionToken(NOW)).not.toBe(
      await createSessionToken(NOW + 1),
    );
  });
});

describe("verifySessionToken — acepta", () => {
  it("un token recién emitido", async () => {
    const token = await createSessionToken(NOW);

    expect(await verifySessionToken(token, NOW)).toBe(true);
  });

  it("un token un instante antes de expirar", async () => {
    const token = await createSessionToken(NOW);

    expect(await verifySessionToken(token, NOW + SESSION_TTL_MS - 1)).toBe(
      true,
    );
  });
});

describe("verifySessionToken — rechaza", () => {
  it("un token exactamente en el instante de expiración", async () => {
    const token = await createSessionToken(NOW);

    expect(await verifySessionToken(token, NOW + SESSION_TTL_MS)).toBe(false);
  });

  it("un token vencido", async () => {
    const token = await createSessionToken(NOW);

    expect(await verifySessionToken(token, NOW + SESSION_TTL_MS + 1)).toBe(
      false,
    );
  });

  it.each([
    ["undefined", undefined],
    ["vacío", ""],
    ["sin separador", "1700000000000"],
    ["solo el separador", "."],
    ["sin firma", "1700000000000."],
    ["sin fecha", ".firma"],
    ["basura", "no-es-un-token"],
  ])("%s", async (_label, token) => {
    expect(await verifySessionToken(token, NOW)).toBe(false);
  });

  // El ataque obvio: estirar la expiración a mano.
  it("un token con la fecha adulterada", async () => {
    const token = await createSessionToken(NOW);
    const signature = token.split(".")[1];
    const forged = `${NOW + SESSION_TTL_MS * 100}.${signature}`;

    expect(await verifySessionToken(forged, NOW)).toBe(false);
  });

  it("un token con la firma adulterada", async () => {
    const token = await createSessionToken(NOW);
    const [expiresAt, signature] = token.split(".");
    const flipped = signature.startsWith("A")
      ? `B${signature.slice(1)}`
      : `A${signature.slice(1)}`;

    expect(await verifySessionToken(`${expiresAt}.${flipped}`, NOW)).toBe(
      false,
    );
  });

  it("un token firmado con otra clave", async () => {
    const token = await createSessionToken(NOW);
    process.env.ADMIN_SESSION_SECRET = "otro-secreto";

    expect(await verifySessionToken(token, NOW)).toBe(false);
  });

  // `Number(" 1700…")` y `Number("0x…")` son números válidos para JS: sin la
  // validación estricta, el mismo instante tendría varias representaciones.
  it.each([
    ["con espacios", " 1700000000000 "],
    ["en hexadecimal", "0x18BCFE56800"],
    ["en notación científica", "1.7e12"],
    ["negativo", "-1700000000000"],
  ])("una fecha %s", async (_label, expiresAt) => {
    expect(await verifySessionToken(`${expiresAt}.cualquiercosa`, NOW)).toBe(
      false,
    );
  });

  it("una firma que no es base64 válido", async () => {
    const token = await createSessionToken(NOW);
    const expiresAt = token.split(".")[0];

    expect(await verifySessionToken(`${expiresAt}.!!!!`, NOW)).toBe(false);
  });
});

describe("verifySessionToken — sin ADMIN_SESSION_SECRET", () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "";
  });

  it("deriva la clave de ADMIN_PASSWORD y sigue funcionando", async () => {
    const token = await createSessionToken(NOW);

    expect(await verifySessionToken(token, NOW)).toBe(true);
  });

  it("la contraseña sigue sin aparecer en el token", async () => {
    const token = await createSessionToken(NOW);

    expect(token).not.toContain("contraseña-de-prueba");
  });

  // Rotar la contraseña cierra las sesiones abiertas. Es el precio de derivar
  // la clave de ella, y está documentado en `adminSessionSecret`.
  it("cambiar la contraseña invalida los tokens ya emitidos", async () => {
    const token = await createSessionToken(NOW);
    process.env.ADMIN_PASSWORD = "otra-contraseña";

    expect(await verifySessionToken(token, NOW)).toBe(false);
  });
});

describe("sessionCookieOptions", () => {
  it("la cookie es httpOnly y no sale en peticiones cross-site", () => {
    const options = sessionCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("el maxAge coincide con la vigencia del token", () => {
    expect(sessionCookieOptions().maxAge).toBe(SESSION_TTL_MS / 1000);
  });
});
