"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EXERCISES, type ExerciseSlug } from "@/lib/stats/exercises";
import type { ExerciseTotals } from "@/lib/stats/queries";

/**
 * La grilla de contadores del panel.
 *
 * Es el único pedazo de cliente de la pantalla: la página es un Server
 * Component que lee los totales y los pasa como props. Acá abajo solo vive lo
 * que necesita estado y eventos.
 *
 * Está pensada para usarse **en el celular, entre series**. Eso decide casi
 * todo el diseño: las tarjetas se miden contra el alto de la pantalla para que
 * entren cuatro y las otras dos queden bajo el scroll, los botones ocupan media
 * tarjeta cada uno para no errarle con el pulgar, y el número sube en el mismo
 * gesto en vez de esperar al servidor.
 */

type Direction = "up" | "down";

export function ExerciseCounterGrid({
  initialTotals,
}: {
  initialTotals: ExerciseTotals;
}) {
  const [totals, setTotals] = useState(initialTotals);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Cuántos requests hay sin responder.
   *
   * Sirve para decidir cuándo hacerle caso al total que devuelve el servidor.
   * Diez taps seguidos son diez requests que pueden responder desordenados, y
   * adoptar el total de una respuesta vieja haría que el número salte hacia
   * atrás. Solo se reconcilia cuando la que responde es la última que quedaba.
   */
  const inFlight = useRef(0);

  function shift(exercise: ExerciseSlug, by: number) {
    setTotals((prev) => ({ ...prev, [exercise]: prev[exercise] + by }));
  }

  async function bump(exercise: ExerciseSlug, direction: Direction) {
    const step = direction === "up" ? 1 : -1;

    // El número se mueve ahora, no cuando responda el servidor. Con la señal
    // de un gimnasio, esperar el round trip por cada repetición hace que la
    // pantalla se sienta rota aunque esté funcionando.
    shift(exercise, step);
    setError(null);
    inFlight.current += 1;

    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise, direction }),
      });

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!res.ok) {
        // Se revierte por `-step` y no restaurando un total guardado de antes:
        // mientras este request viajaba pueden haber entrado otros taps, y
        // pisar el número con una foto vieja los borraría.
        shift(exercise, -step);
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo guardar.");
        return;
      }

      const data = await res.json();
      if (inFlight.current === 1 && typeof data.total === "number") {
        setTotals((prev) => ({ ...prev, [exercise]: data.total }));
      }
    } catch {
      shift(exercise, -step);
      setError("Sin conexión. Ese toque no se guardó.");
    } finally {
      inFlight.current -= 1;
    }
  }

  return (
    <>
      {error && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {EXERCISES.map((exercise) => {
          const total = totals[exercise.slug];

          return (
            <section
              key={exercise.slug}
              // El alto se mide contra la pantalla —no contra el contenido—
              // para que entren exactamente cuatro tarjetas y las otras dos
              // pidan scroll. `dvh` y no `vh`: en móvil la barra del navegador
              // aparece y desaparece, y `vh` ignora ese cambio.
              className="flex min-h-[calc((100dvh-9rem)/2)] flex-col rounded-2xl border border-border bg-card p-3 md:min-h-52"
            >
              <h2 className="text-center text-xs font-semibold text-muted-foreground">
                {exercise.label}
              </h2>

              <p className="flex flex-1 items-center justify-center">
                {/* `tabular-nums` para que el ancho no cambie al pasar de 9 a
                    10: sin eso el número salta de lugar en cada tap. */}
                <span className="text-4xl font-bold tabular-nums text-foreground">
                  {total}
                </span>
                {exercise.unit === "seconds" && (
                  <span className="ml-1 text-sm text-muted-foreground">s</span>
                )}
              </p>

              {/* `gap-px` sobre fondo `border` dibuja la línea que separa las
                  dos mitades sin un borde que se sume al ancho. */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border">
                <button
                  type="button"
                  // Deshabilitado en cero: el servidor igual lo rechaza, pero
                  // enterarse por un mensaje de error algo que se puede ver en
                  // el botón es peor, y ahorra un request que ya se sabe que
                  // va a fallar.
                  disabled={total === 0}
                  onClick={() => bump(exercise.slug, "down")}
                  aria-label={`Restar en ${exercise.label}`}
                  className="select-none bg-muted py-4 text-lg font-bold text-foreground transition-colors touch-manipulation active:bg-muted/60 disabled:opacity-40"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => bump(exercise.slug, "up")}
                  aria-label={`Sumar en ${exercise.label}`}
                  // `touch-manipulation` desactiva el doble-tap para hacer
                  // zoom, que en móvil le mete ~300 ms de retardo a cada tap.
                  className="select-none bg-brand py-4 text-lg font-bold text-white transition-colors touch-manipulation active:bg-brand/80"
                >
                  +
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
