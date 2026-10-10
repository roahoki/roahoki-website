import { describe, expect, it } from "vitest";
import {
  MIN_IMAGE_WIDTH,
  normalizeImageWidth,
  parseImageSrc,
  withImageWidth,
} from "./image-width";

const URL =
  "https://x.supabase.co/storage/v1/object/public/logbook-images/a.jpg";

describe("parseImageSrc", () => {
  it("una imagen sin fragmento va a ancho completo", () => {
    expect(parseImageSrc(URL)).toEqual({ src: URL, width: null });
  });

  it("lee el ancho del fragmento y lo saca de la URL", () => {
    expect(parseImageSrc(`${URL}#w=60`)).toEqual({ src: URL, width: 60 });
  });

  // Un fragmento escrito a mano fuera de rango no puede dejar una imagen de
  // 1 px ni más ancha que la portada.
  it.each(["#w=5", "#w=100", "#w=250"])(
    "descarta %s pero lo saca de la URL",
    (fragment) => {
      expect(parseImageSrc(`${URL}${fragment}`)).toEqual({
        src: URL,
        width: null,
      });
    },
  );

  it("no toca otros fragmentos", () => {
    expect(parseImageSrc(`${URL}#seccion`)).toEqual({
      src: `${URL}#seccion`,
      width: null,
    });
  });
});

describe("withImageWidth", () => {
  it("agrega el ancho", () => {
    expect(withImageWidth(URL, 45)).toBe(`${URL}#w=45`);
  });

  it("reemplaza el ancho anterior", () => {
    expect(withImageWidth(`${URL}#w=45`, 70)).toBe(`${URL}#w=70`);
  });

  it("a ancho completo no deja fragmento", () => {
    expect(withImageWidth(`${URL}#w=45`, null)).toBe(URL);
  });
});

describe("normalizeImageWidth", () => {
  it("redondea", () => {
    expect(normalizeImageWidth(62.4)).toBe(62);
  });

  it("no baja del mínimo", () => {
    expect(normalizeImageWidth(3)).toBe(MIN_IMAGE_WIDTH);
  });

  it("cerca del ancho completo se pega a él", () => {
    expect(normalizeImageWidth(97.2)).toBeNull();
    expect(normalizeImageWidth(140)).toBeNull();
  });
});
