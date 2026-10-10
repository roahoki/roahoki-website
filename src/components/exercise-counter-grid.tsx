"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { COUNTER_STEP, MAX_MANUAL_AMOUNT } from "@/lib/schemas/stats";
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
 *
 * Hay dos formas de cargar, para dos momentos distintos: el "+" para contar
 * repetición por repetición mientras la hago, y el campo de abajo para anotar
 * una serie entera de una —doce dominadas, sesenta segundos de handstand— sin
 * dar sesenta toques.
 */

type Direction = "up" | "down";

/** Lo escrito en cada campo, mientras no se haya enviado. */
type Drafts = Partial<Record<ExerciseSlug, string>>;

/**
 * Qué vale lo escrito, o `null` si todavía no vale nada.
 *
 * Los mismos límites que el esquema de zod, repetidos acá a propósito: esto
 * decide si el botón está habilitado, y el servidor decide si el evento se
 * guarda. Sin la copia del cliente, escribir un cero y tocar "Sumar" costaría
 * un viaje de red para recibir un error que ya se sabía.
 */
function parseManualAmount(draft: string): number | null {
  const trimmed = draft.trim();
  if (trimmed === "") return null;

  const amount = Number(trimmed);
  if (!Number.isInteger(amount)) return null;
  if (amount < 1 || amount > MAX_MANUAL_AMOUNT) return null;

  return amount;
}

export function ExerciseCounterGrid({
  initialTotals,
}: {
  initialTotals: ExerciseTotals;
}) {
  const [totals, setTotals] = useState(initialTotals);
  const [drafts, setDrafts] = useState<Drafts>({});
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

  /**
   * Mueve el contador. Sin `amount` vale un tap; con `amount`, la serie
   * escrita.
   *
   * El `amount` solo se manda cuando existe: un tap sigue viajando como
   * `{ exercise, direction }` pelado, y el paso lo pone el servidor.
   */
  async function bump(
    exercise: ExerciseSlug,
    direction: Direction,
    amount?: number,
  ) {
    const step = (amount ?? COUNTER_STEP) * (direction === "up" ? 1 : -1);

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
        body: JSON.stringify(
          amount === undefined
            ? { exercise, direction }
            : { exercise, direction, amount },
        ),
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

  function submitDraft(event: FormEvent<HTMLFormElement>, slug: ExerciseSlug) {
    // Es un `<form>` y no un botón suelto para que el Enter del teclado del
    // celular también envíe: con el teclado numérico abierto, tener que buscar
    // el botón con el pulgar es un paso de más.
    event.preventDefault();

    const amount = parseManualAmount(drafts[slug] ?? "");
    if (amount === null) return;

    // El campo se limpia antes de saber si el servidor aceptó, igual que el
    // número sube antes: la próxima serie se escribe sobre un campo vacío, y
    // si algo falla el mensaje de error lo dice y el total vuelve solo.
    setDrafts((prev) => ({ ...prev, [slug]: "" }));
    bump(slug, "up", amount);
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
          const draft = drafts[exercise.slug] ?? "";
          const amount = parseManualAmount(draft);

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

              <form
                onSubmit={(event) => submitDraft(event, exercise.slug)}
                className="mt-2 flex gap-1.5"
              >
                <input
                  // `inputMode="numeric"` abre el teclado de números en el
                  // celular; `type="number"` solo no alcanza en iOS.
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_MANUAL_AMOUNT}
                  step={1}
                  value={draft}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [exercise.slug]: event.target.value,
                    }))
                  }
                  placeholder={exercise.unit === "seconds" ? "seg" : "reps"}
                  aria-label={`Cantidad para ${exercise.label}`}
                  // `min-w-0` para que el input no imponga su ancho por
                  // defecto y desborde la tarjeta, que en móvil es media
                  // pantalla. Las flechitas de `type="number"` se apagan: en
                  // desktop se comen ancho del campo, y en el celular no
                  // existen.
                  className="w-full min-w-0 rounded-lg border border-border bg-muted px-2 py-2 text-center text-sm tabular-nums text-foreground outline-none [appearance:textfield] placeholder:text-muted-foreground focus:border-brand [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="submit"
                  // Deshabilitado mientras lo escrito no sea una cantidad
                  // válida: el botón apagado dice que falta algo sin tener que
                  // mandar el request para que el servidor lo explique.
                  disabled={amount === null}
                  aria-label={`Sumar la cantidad escrita en ${exercise.label}`}
                  className="shrink-0 select-none rounded-lg bg-muted px-3 text-xs font-semibold text-foreground transition-colors touch-manipulation active:bg-muted/60 disabled:opacity-40"
                >
                  Sumar
                </button>
              </form>
            </section>
          );
        })}
      </div>
    </>
  );
}
