"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LogoMark } from "@/components/brand/logo-mark";

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
      setError("no es esa");
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
        : "/admin/logbook";

    router.push(next);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor="password" className="sr-only">
        contraseña
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="contraseña"
        // Pantalla de un solo campo cuyo único propósito es escribir la
        // contraseña: enfocarlo no desorienta ni le roba el foco a nada.
        // biome-ignore lint/a11y/noAutofocus: justificado arriba
        autoFocus
        aria-invalid={error !== ""}
        aria-describedby={error ? "password-error" : undefined}
        className="w-full rounded-md border border-ink bg-paper px-3.5 py-3 text-body text-ink placeholder:text-faded focus:outline-2 focus:outline-offset-2 focus:outline-leaf"
      />
      {error && (
        <p
          id="password-error"
          role="alert"
          className="text-entry-meta text-ink"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-md border border-ink text-action text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {loading ? "entrando…" : "entrar"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4">
        <LogoMark size={72} />
        <h1 className="text-card-title-sm text-ink">hola, roahoki</h1>
        <div className="w-full pt-4">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
