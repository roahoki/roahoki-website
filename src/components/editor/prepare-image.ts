import { palette } from "@/lib/brand/palette";
import { MAX_IMAGE_BYTES, uploadImageSchema } from "@/lib/schemas/logbook";
import { extensionOf } from "@/lib/storage";
import { uploadImage } from "./upload-image";

/**
 * Lo que le pasa a una foto antes de subirse.
 *
 * 1. **Se le borran los metadatos.** Una foto de celular puede traer la fecha,
 *    el modelo del teléfono y las coordenadas GPS de donde se sacó, y el sitio
 *    publica el archivo tal cual: cualquiera que la descargue los lee. Volver a
 *    codificarla en un canvas no copia nada de eso. Por eso **toda** foto pasa
 *    por acá, aunque ya sea chica.
 * 2. **Se achica a 2000 px en el lado largo**, sin agrandar nunca. Es más de lo
 *    que el sitio muestra en cualquier pantalla (896 px de ancho máximo, ~1800
 *    en retina), así que no se pierde calidad visible, y una foto de celular
 *    deja de chocar con el límite de 4 MB.
 *
 * La calidad es alta (0,9) a propósito: el sitio muestra fotos cuidadas.
 *
 * Los GIF no se tocan: el canvas se queda con el primer cuadro y perderían la
 * animación. El formato no tiene EXIF.
 */

export const MAX_IMAGE_SIDE = 2000;
export const JPEG_QUALITY = 0.9;

type OutputType = "image/png" | "image/jpeg";

/** El tamaño final: entra en `max` por lado y conserva la proporción. */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_IMAGE_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * En qué formato sale, o `null` si no se toca (GIF).
 *
 * Un PNG sigue siendo PNG: suelen ser capturas, y en JPEG el texto se ensucia.
 * Todo lo demás (JPEG, WebP, AVIF, HEIC del iPhone) sale en JPEG, que es lo que
 * todos los navegadores saben codificar.
 */
export function outputTypeFor(file: File): OutputType | null {
  const extension = extensionOf(file.name);
  if (file.type === "image/gif" || extension === "gif") return null;
  if (file.type === "image/png" || extension === "png") return "image/png";
  return "image/jpeg";
}

function renamed(name: string, type: OutputType): string {
  const base = name.replace(/\.[^.]+$/, "") || "imagen";
  return `${base}.${type === "image/png" ? "png" : "jpg"}`;
}

/** Leer y escribir imágenes. Se inyecta en los tests, donde no hay canvas. */
export type ImageCodec = {
  decode(file: File): Promise<{
    width: number;
    height: number;
    draw(width: number, height: number): Promise<CanvasImageSource>;
    close(): void;
  }>;
  encode(
    source: CanvasImageSource,
    width: number,
    height: number,
    type: OutputType,
  ): Promise<Blob>;
};

export const browserCodec: ImageCodec = {
  async decode(file) {
    // `from-image` endereza la foto según su EXIF antes de que se pierda: sin
    // eso, una foto vertical del celular quedaría acostada.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      width: bitmap.width,
      height: bitmap.height,
      // Achicar con `createImageBitmap` y calidad alta da un resultado más
      // nítido que dejárselo a `drawImage` en un solo paso.
      draw: (width, height) =>
        width === bitmap.width && height === bitmap.height
          ? Promise.resolve(bitmap)
          : createImageBitmap(bitmap, {
              resizeWidth: width,
              resizeHeight: height,
              resizeQuality: "high",
            }),
      close: () => bitmap.close(),
    };
  },

  encode(source, width, height, type) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return Promise.reject(new Error("sin canvas"));
    // JPEG no tiene transparencia: lo transparente queda del color del papel,
    // que es sobre lo que se va a ver, y no negro.
    if (type === "image/jpeg") {
      context.fillStyle = palette.paper;
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("sin imagen"))),
        type,
        JPEG_QUALITY,
      ),
    );
  },
};

/** La foto lista para subir: sin metadatos y a lo sumo de 2000 px. */
export async function prepareImage(
  file: File,
  codec: ImageCodec = browserCodec,
): Promise<File> {
  let type = outputTypeFor(file);
  if (type === null) return file;

  const image = await codec.decode(file);
  try {
    const size = fitWithin(image.width, image.height);
    const source = await image.draw(size.width, size.height);
    let blob = await codec.encode(source, size.width, size.height, type);
    // Un PNG de una foto (no de una captura) puede seguir pesando más de lo
    // que se acepta aun achicado. En JPEG entra con la misma calidad visible.
    if (type === "image/png" && blob.size > MAX_IMAGE_BYTES) {
      type = "image/jpeg";
      blob = await codec.encode(source, size.width, size.height, type);
    }
    return new File([blob], renamed(file.name, type), { type });
  } finally {
    image.close();
  }
}

/**
 * Procesa la foto y la sube. Es lo que usan el editor y el panel de datos.
 *
 * El tamaño se valida sobre la foto ya procesada, que es la que se sube: una
 * foto de 6 MB del celular entra sin problema una vez achicada.
 */
export async function uploadPreparedImage(
  file: File,
  onProgress: (percent: number) => void,
  codec: ImageCodec = browserCodec,
): Promise<string> {
  let ready: File;
  try {
    ready = await prepareImage(file, codec);
  } catch {
    throw new Error("no se pudo leer la imagen.");
  }

  const parsed = uploadImageSchema.safeParse({
    extension: extensionOf(ready.name) ?? "",
    size: ready.size,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "no se pudo subir.");
  }

  return uploadImage(ready, onProgress);
}
