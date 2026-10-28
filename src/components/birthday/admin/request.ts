/**
 * Lo que comparten las acciones del panel del cumpleaños al hablar con la API:
 * mandar JSON, mandar al login si la sesión venció y traducir el error a un
 * mensaje que se pueda mostrar.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function request<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) {
      window.location.assign(
        `/admin/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
      return { ok: false, error: "La sesión venció." };
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "No se pudo guardar." };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Sin conexión. No se guardó." };
  }
}
