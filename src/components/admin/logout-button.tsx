"use client";

import { useRouter } from "next/navigation";

/** Cierra la sesión del panel y vuelve al ingreso. */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className={className}>
      salir
    </button>
  );
}
