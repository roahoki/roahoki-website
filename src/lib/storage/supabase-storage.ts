import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/env";
import type {
  Bucket,
  StorageAdapter,
  UploadInput,
  UploadResult,
} from "./types";
import { StorageError } from "./types";

/**
 * La implementación real de `StorageAdapter`, sobre Supabase Storage.
 *
 * Este es el único archivo del proyecto que crea un cliente de `supabase-js`.
 * Todo lo demás recibe la interfaz.
 */
function adapterFor(client: SupabaseClient): StorageAdapter {
  return {
    async upload({
      bucket,
      path,
      body,
      contentType,
    }: UploadInput): Promise<UploadResult> {
      const { error } = await client.storage.from(bucket).upload(path, body, {
        contentType,
        // Las rutas se generan con timestamp y sufijo aleatorio, así que una
        // colisión significa que algo anda mal, no que haya que pisar.
        upsert: false,
      });

      if (error) {
        throw new StorageError(`No se pudo subir ${path}.`, error);
      }

      return { path, url: publicUrlFrom(client, bucket, path) };
    },

    publicUrl(bucket: Bucket, path: string) {
      return publicUrlFrom(client, bucket, path);
    },

    async remove(bucket: Bucket, path: string) {
      const { error } = await client.storage.from(bucket).remove([path]);
      // Supabase no distingue "no existía" de un fallo real, así que borrar dos
      // veces no es un error para el llamador.
      if (error) {
        throw new StorageError(`No se pudo borrar ${path}.`, error);
      }
    },
  };
}

function publicUrlFrom(
  client: SupabaseClient,
  bucket: Bucket,
  path: string,
): string {
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Adapter para el browser, con la anon key.
 *
 * Se crea al momento de usarlo y no a nivel de módulo: si faltara una variable
 * de entorno, un throw en module scope dejaría la página en blanco en vez de
 * fallar solo la subida.
 */
export function createBrowserStorage(): StorageAdapter {
  return adapterFor(createClient(supabaseUrl(), supabaseAnonKey()));
}

/**
 * Adapter para el servidor, con la service_role.
 *
 * **Nunca importar esto desde un componente de cliente.** `supabaseServiceRoleKey()`
 * lee una variable sin prefijo `NEXT_PUBLIC_`, así que en el browser vendría
 * vacía —y si no lo estuviera, sería una clave privilegiada en el bundle—.
 *
 * `persistSession: false` porque en el servidor no hay a quién persistirle nada
 * y cada request es independiente.
 */
export function createServerStorage(): StorageAdapter {
  return adapterFor(
    createClient(supabaseUrl(), supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}
