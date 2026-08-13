/**
 * La frontera con el almacenamiento de archivos.
 *
 * `CLAUDE.md` confina `supabase-js` a `src/lib/storage/`: todo lo demás habla
 * con Postgres por Drizzle. Este archivo es el contrato de esa frontera, y no
 * menciona a Supabase por ninguna parte a propósito.
 *
 * Dos razones concretas, ninguna especulativa:
 *
 * 1. **Testeable.** Subir una imagen era código que solo se podía probar
 *    corriendo la app y mirando. Con una interfaz, el editor del logbook se
 *    prueba contra un doble en memoria (`FakeStorage`).
 * 2. **Un solo lugar donde cambiar de proveedor.** Supabase Storage no
 *    transcodifica video, y el día que haga falta S3 o Cloudflare R2 el cambio
 *    es una implementación nueva de esta interfaz.
 */

/** Los buckets que existen. Nombrarlos evita el string suelto en cada llamada. */
export const BUCKETS = {
  testimonialImages: "testimonial-images",
  logbookImages: "logbook-images",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export type UploadInput = {
  bucket: Bucket;
  /** Ruta dentro del bucket. Se arma con `objectPath`. */
  path: string;
  body: Blob | File | ArrayBuffer | Uint8Array;
  /** MIME del archivo. Sin esto el navegador descarga en vez de mostrar. */
  contentType?: string;
};

export type UploadResult = {
  path: string;
  /** URL pública y absoluta, lista para guardar en la base o en el markdown. */
  url: string;
};

export interface StorageAdapter {
  upload(input: UploadInput): Promise<UploadResult>;
  /** URL pública de un objeto ya subido, sin ir a la red. */
  publicUrl(bucket: Bucket, path: string): string;
  /** Borra un objeto. No falla si no existía. */
  remove(bucket: Bucket, path: string): Promise<void>;
}

/** Falla de la capa de storage, para distinguirla de un error de programación. */
export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/** Extensiones que se aceptan, y el MIME con el que se sirven. */
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export const ALLOWED_IMAGE_EXTENSIONS = Object.keys(CONTENT_TYPES);

/** El MIME que corresponde a una extensión, o `undefined` si no se acepta. */
export function contentTypeFor(extension: string): string | undefined {
  return CONTENT_TYPES[extension.toLowerCase()];
}

/**
 * La extensión de un nombre de archivo, en minúsculas y sin el punto.
 *
 * Devuelve `null` si no tiene, en vez de inventar `jpg` como hacía el código
 * anterior: un `.png` sin extensión terminaba servido como JPEG.
 */
export function extensionOf(filename: string): string | null {
  const match = /\.([a-z\d]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : null;
}

/**
 * Arma la ruta de un objeto: `<prefijo>/<timestamp>-<aleatorio>.<ext>`.
 *
 * El nombre original **no** se reutiliza. Dos personas que suban `foto.jpg`
 * colisionarían, y un nombre controlado por quien sube es una vía para meter
 * caracteres raros o rutas con `../` en la clave del objeto.
 *
 * El timestamp adelante mantiene el orden cronológico al listar el bucket, que
 * es lo único que se puede pedir cuando el nombre no dice nada.
 *
 * `random` se inyecta para poder fijarlo en los tests.
 */
export function objectPath(
  extension: string,
  options: { prefix?: string; now?: () => number; random?: () => string } = {},
): string {
  const now = options.now ?? Date.now;
  const random =
    options.random ?? (() => Math.random().toString(36).slice(2, 10));

  const name = `${now()}-${random()}.${extension.toLowerCase()}`;
  return options.prefix ? `${options.prefix}/${name}` : name;
}
