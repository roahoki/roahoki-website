/**
 * Punto de entrada de la capa de storage.
 *
 * Reexporta el contrato y los helpers puros. Las implementaciones se importan
 * de su propio archivo a propósito: `supabase-storage` arrastra `supabase-js`,
 * y `fake-storage` solo tiene sentido en tests. Que no salgan por acá evita que
 * un componente de cliente termine importando cualquiera de los dos sin querer.
 */
export {
  ALLOWED_IMAGE_EXTENSIONS,
  BUCKETS,
  type Bucket,
  contentTypeFor,
  extensionOf,
  objectPath,
  type StorageAdapter,
  StorageError,
  type UploadInput,
  type UploadResult,
} from "./types";
