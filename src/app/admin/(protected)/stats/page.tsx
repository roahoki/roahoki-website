import Link from "next/link";
import { ExerciseCounterGrid } from "@/components/exercise-counter-grid";
import { formatWeekRange } from "@/lib/stats/format";
import { currentWeekTotals } from "@/lib/stats/queries";
import { weekRangeAt } from "@/lib/stats/week";

/**
 * La pantalla desde la que registro las series.
 *
 * Server Component: consulta con la query directo, sin pasar por
 * `/api/admin/stats`. El layout de `(protected)` ya verificó la sesión, y una
 * llamada HTTP a la propia app sería un salto de red para leer lo mismo. Igual
 * que el listado del logbook.
 *
 * `force-dynamic` porque el número tiene que ser el de ahora: abrir el panel y
 * ver un total viejo llevaría a sumar de nuevo lo ya sumado.
 */
export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const now = new Date();
  const totals = await currentWeekTotals(now);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-foreground">Stats</h1>
          {/* Qué semana se está contando. Sin esto, un lunes temprano los seis
              ceros parecen datos perdidos en vez de una semana que empieza. */}
          <p className="text-[11px] text-muted-foreground">
            Semana del {formatWeekRange(weekRangeAt(now))}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/logbook"
            className="whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Logbook
          </Link>
          <Link
            href="/admin/testimonials"
            className="whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Testimonios
          </Link>
        </div>
      </div>

      <ExerciseCounterGrid initialTotals={totals} />
    </main>
  );
}
