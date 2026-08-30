"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Contraseña incorrecta.");
      setLoading(false);
      return;
    }

    // `next` debe ser una ruta interna: solo permitimos paths que empiecen
    // con `/` y no contengan `//` ni `@` (técnica de open redirect con URLs
    // relativas a protocolo o rutas con authority).
    const raw = searchParams.get("next") ?? "";
    const next =
      raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("@")
        ? raw
        : "/admin/logbook/new";

    router.push(next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        // Pantalla de un solo campo cuyo único propósito es escribir la
        // contraseña: enfocarlo no desorienta ni le roba el foco a nada.
        // biome-ignore lint/a11y/noAutofocus: justificado arriba
        autoFocus
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <h1 className="text-base font-bold text-foreground mb-6 text-center">
          Admin
        </h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
