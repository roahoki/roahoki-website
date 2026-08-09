/**
 * Acceso tipado a las variables de entorno.
 *
 * Reemplaza el patrón `process.env.FOO!`, que le miente al compilador: la
 * aserción calla el error de tipos pero no evita que el valor llegue vacío en
 * runtime. Acá se falla de inmediato y con un mensaje que dice qué falta.
 *
 * Cada variable se lee de forma explícita y nunca con un índice dinámico
 * (`process.env[name]`): Next.js reemplaza los literales `process.env.NEXT_PUBLIC_*`
 * en tiempo de build, así que un acceso dinámico quedaría `undefined` en el
 * browser.
 *
 * Son funciones y no constantes para que la lectura sea perezosa. Si fueran
 * constantes a nivel de módulo, importar una variable del servidor desde un
 * componente de cliente reventaría el bundle.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa .env.local (ver .env.example).`,
    );
  }
  return value;
}

// --- Públicas: se inyectan en el bundle del browser ------------------------

export function supabaseUrl(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
}

export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

// --- Privadas: solo server-side. Nunca bajo el prefijo NEXT_PUBLIC_ --------

export function supabaseServiceRoleKey(): string {
  return required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
}

export function adminPassword(): string {
  return required(process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD");
}
