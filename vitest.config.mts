import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Resuelve el alias `@/*` leyendo tsconfig.json, igual que Next.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    // happy-dom en vez de jsdom: jsdom 30 arrastra un `undici` que exige una
    // API de Node más nueva que la del entorno (v20.20) y revienta al cargar.
    // happy-dom no tiene esa dependencia y además es más rápido.
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Los archivos corren de a uno. Los tests de integración comparten una
    // única base de pruebas y algunos la reinician entera (`drop schema public
    // cascade`): en paralelo, un archivo borra el esquema mientras otro está
    // consultándolo. Con esta suite el costo de serializar es despreciable.
    fileParallelism: false,
  },
});
