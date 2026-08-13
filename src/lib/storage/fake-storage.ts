import type {
  Bucket,
  StorageAdapter,
  UploadInput,
  UploadResult,
} from "./types";
import { StorageError } from "./types";

/**
 * `StorageAdapter` en memoria, para los tests.
 *
 * Vive en `src/` y no en `src/test/` porque el editor del logbook lo va a
 * necesitar desde sus propios tests, y porque tenerlo al lado de la interfaz
 * hace evidente que las dos tienen que moverse juntas.
 *
 * No pretende imitar a Supabase en todo: imita el contrato de `StorageAdapter`,
 * que es lo único contra lo que se programa.
 */
export class FakeStorage implements StorageAdapter {
  /** Lo subido, por `<bucket>/<path>`. Público para poder afirmar sobre él. */
  readonly objects = new Map<string, { body: unknown; contentType?: string }>();

  /** Cuando se define, la próxima subida falla. Para probar el camino de error. */
  failNextUpload: string | null = null;

  constructor(private readonly baseUrl = "https://storage.test") {}

  async upload({
    bucket,
    path,
    body,
    contentType,
  }: UploadInput): Promise<UploadResult> {
    if (this.failNextUpload !== null) {
      const message = this.failNextUpload;
      this.failNextUpload = null;
      throw new StorageError(message);
    }

    const key = `${bucket}/${path}`;
    // El adapter real sube con `upsert: false`; pisar sin avisar acá escondería
    // una colisión que en producción sí fallaría.
    if (this.objects.has(key)) {
      throw new StorageError(`Ya existe un objeto en ${key}.`);
    }

    this.objects.set(key, { body, contentType });
    return { path, url: this.publicUrl(bucket, path) };
  }

  publicUrl(bucket: Bucket, path: string): string {
    return `${this.baseUrl}/${bucket}/${path}`;
  }

  async remove(bucket: Bucket, path: string): Promise<void> {
    this.objects.delete(`${bucket}/${path}`);
  }

  /** Cuántos objetos hay en un bucket. Atajo para las aserciones. */
  countIn(bucket: Bucket): number {
    return [...this.objects.keys()].filter((key) =>
      key.startsWith(`${bucket}/`),
    ).length;
  }
}
