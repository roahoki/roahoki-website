import type { Metadata } from "next";
import Link from "next/link";
import { EXERCISES } from "@/lib/stats/exercises";
import { formatWeekRange } from "@/lib/stats/format";
import { currentWeekTotals, type ExerciseTotals } from "@/lib/stats/queries";
import { weekRangeAt } from "@/lib/stats/week";

/**
 * Los contadores, en público.
 *
 * ISR y no render dinámico. El intervalo **no** es el mecanismo por el que
 * aparecen los números nuevos: de eso se encarga el `revalidatePath("/stats")`
 * que dispara cada toque en el panel (PR 2). Acá el intervalo es la red de
 * seguridad, y lo que fija su tamaño es el cambio de semana: el lunes a las
 * 00:00 UTC los contadores tienen que estar en cero aunque yo no haya entrenado
 * —ninguna escritura revalida nada—, así que diez minutos es el máximo que la
 * página puede quedarse mostrando la semana que terminó.
 */
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Stats — roahoki",
  description:
    "Cuántas dominadas, flexiones, sentadillas, fondos, segundos de handstand y sentadillas pistol llevo esta semana.",
  alternates: { canonical: "/stats" },
};

export default async function StatsPage() {
  const now = new Date();

  let totals: ExerciseTotals | null = null;
  try {
    totals = await currentWeekTotals(now);
  } catch {
    // Mismo criterio que el listado del logbook: si la base no responde durante
    // el build, la página sale sin números en vez de voltear el deploy. Se
    // distingue de "todavía no entrené" —que son ceros de verdad— porque un
    // cero es un dato y esto es la ausencia de dato; mostrar ceros acá sería
    // afirmar algo falso.
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <Link
          href="/"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← roahoki
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
          Stats
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo que llevo esta semana. Los contadores vuelven a cero cada lunes.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Semana del {formatWeekRange(weekRangeAt(now))}
        </p>
      </header>

      {totals === null ? (
        <p className="py-12 text-sm text-muted-foreground">
          No se pudieron cargar los contadores.
        </p>
      ) : (
        // Dos columnas en el celular y tres desde `sm`. El número es lo que se
        // viene a ver, así que la grilla no lleva bordes ni tarjetas: nada que
        // compita con él.
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {EXERCISES.map((exercise) => (
            <li key={exercise.slug} className="text-center">
              {/* El número va **arriba** del título y bastante más grande: se
                  lee primero el cuánto y después el qué. `tabular-nums` para
                  que los números de la fila queden alineados entre sí. */}
              <p className="text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
                {totals[exercise.slug]}
                {exercise.unit === "seconds" && (
                  <span className="ml-1 text-xl font-semibold text-muted-foreground sm:text-2xl">
                    s
                  </span>
                )}
              </p>
              <h2 className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                {exercise.label}
              </h2>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
