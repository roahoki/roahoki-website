import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "@/lib/schemas/logbook";
import {
  fitWithin,
  type ImageCodec,
  outputTypeFor,
  prepareImage,
  uploadPreparedImage,
} from "./prepare-image";

vi.mock("./upload-image", () => ({
  uploadImage: vi.fn(async (file: File) => `https://cdn.test/${file.name}`),
}));

/**
 * Un codec falso: "decodifica" con el tamaño dado y "codifica" un blob del
 * peso pedido. Registra con qué tamaño y formato se codificó.
 */
function fakeCodec(
  width: number,
  height: number,
  bytes: (type: string) => number = () => 1000,
) {
  const encoded: { width: number; height: number; type: string }[] = [];
  const close = vi.fn();
  const codec: ImageCodec = {
    decode: async () => ({
      width,
      height,
      draw: async () => ({}) as CanvasImageSource,
      close,
    }),
    encode: async (_source, w, h, type) => {
      encoded.push({ width: w, height: h, type });
      return new Blob([new Uint8Array(bytes(type))], { type });
    },
  };
  return { codec, encoded, close };
}

const file = (name: string, type: string) => new File(["x"], name, { type });

afterEach(() => vi.clearAllMocks());

describe("fitWithin", () => {
  it("achica el lado largo a 2000 y conserva la proporción", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 });
  });

  it("nunca agranda", () => {
    expect(fitWithin(736, 414)).toEqual({ width: 736, height: 414 });
  });
});

describe("outputTypeFor", () => {
  it.each([
    ["foto.jpg", "image/jpeg", "image/jpeg"],
    ["IMG_2041.HEIC", "image/heic", "image/jpeg"],
    ["foto.webp", "image/webp", "image/jpeg"],
    ["captura.png", "image/png", "image/png"],
    ["animacion.gif", "image/gif", null],
  ])("%s → %s", (name, type, expected) => {
    expect(outputTypeFor(file(name, type))).toBe(expected);
  });
});

describe("prepareImage", () => {
  // Codificar de nuevo es lo que borra el EXIF: una foto chica también pasa
  // por el canvas, aunque no haya que achicarla.
  it("vuelve a codificar toda foto, aunque no haya que achicarla", async () => {
    const { codec, encoded, close } = fakeCodec(736, 414);
    const ready = await prepareImage(file("chica.jpg", "image/jpeg"), codec);

    expect(encoded).toEqual([{ width: 736, height: 414, type: "image/jpeg" }]);
    expect(ready.name).toBe("chica.jpg");
    expect(close).toHaveBeenCalled();
  });

  it("una foto de celular sale achicada y en JPEG", async () => {
    const { codec, encoded } = fakeCodec(3024, 4032);
    const ready = await prepareImage(
      file("IMG_2041.HEIC", "image/heic"),
      codec,
    );

    expect(encoded).toEqual([
      { width: 1500, height: 2000, type: "image/jpeg" },
    ]);
    expect(ready).toMatchObject({ name: "IMG_2041.jpg", type: "image/jpeg" });
  });

  it("una captura sigue en PNG", async () => {
    const { codec } = fakeCodec(1617, 900);
    const ready = await prepareImage(file("captura.png", "image/png"), codec);
    expect(ready).toMatchObject({ name: "captura.png", type: "image/png" });
  });

  it("un PNG que sigue pesando demasiado pasa a JPEG", async () => {
    const { codec, encoded } = fakeCodec(3000, 2000, (type) =>
      type === "image/png" ? MAX_IMAGE_BYTES + 1 : 1000,
    );
    const ready = await prepareImage(file("foto.png", "image/png"), codec);

    expect(encoded.map((e) => e.type)).toEqual(["image/png", "image/jpeg"]);
    expect(ready).toMatchObject({ name: "foto.jpg", type: "image/jpeg" });
  });

  it("un GIF no se toca, para no perder la animación", async () => {
    const { codec, encoded } = fakeCodec(400, 300);
    const gif = file("animacion.gif", "image/gif");

    expect(await prepareImage(gif, codec)).toBe(gif);
    expect(encoded).toEqual([]);
  });
});

describe("uploadPreparedImage", () => {
  it("sube la foto procesada", async () => {
    const { codec } = fakeCodec(4032, 3024);
    await expect(
      uploadPreparedImage(file("IMG_1.HEIC", "image/heic"), vi.fn(), codec),
    ).resolves.toBe("https://cdn.test/IMG_1.jpg");
  });

  it("avisa si el navegador no puede leer la imagen", async () => {
    const codec: ImageCodec = {
      decode: () => Promise.reject(new Error("formato desconocido")),
      encode: () => Promise.reject(new Error("no llega acá")),
    };
    await expect(
      uploadPreparedImage(file("IMG_1.HEIC", "image/heic"), vi.fn(), codec),
    ).rejects.toThrow("no se pudo leer la imagen.");
  });

  it("valida el peso de lo que se sube, no del original", async () => {
    const { codec } = fakeCodec(2000, 1000, () => MAX_IMAGE_BYTES + 1);
    await expect(
      uploadPreparedImage(file("foto.jpg", "image/jpeg"), vi.fn(), codec),
    ).rejects.toThrow("más de 4 MB");
  });
});
