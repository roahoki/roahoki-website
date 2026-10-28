import { describe, expect, it } from "vitest";
import { generateToken, isToken, TOKEN_LENGTH } from "./token";

describe("token del link personal", () => {
  it("tiene el largo y el alfabeto que exige la base", () => {
    const token = generateToken();
    expect(token).toHaveLength(TOKEN_LENGTH);
    expect(isToken(token)).toBe(true);
  });

  it("no se repite", () => {
    const tokens = new Set(Array.from({ length: 2000 }, generateToken));
    expect(tokens.size).toBe(2000);
  });

  it("usa todo el alfabeto, no solo una parte", () => {
    // Con 2000 tokens de 12 caracteres salen las 62 letras salvo mala suerte
    // astronómica. Si faltan, el rechazo de bytes quedó mal.
    const chars = new Set(Array.from({ length: 2000 }, generateToken).join(""));
    expect(chars.size).toBe(62);
  });

  it("rechaza lo que no tiene la forma de un token", () => {
    expect(isToken("abc")).toBe(false);
    expect(isToken("abcdefghijk!")).toBe(false);
    expect(isToken("abcdefghijklm")).toBe(false);
    expect(isToken(null)).toBe(false);
  });
});
