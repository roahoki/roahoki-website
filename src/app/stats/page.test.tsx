import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExerciseTotals } from "@/lib/stats/queries";

/**
 * La página pública de los contadores.
 *
 * Dos cosas que probar. La primera es la resiliencia del build, por lo mismo
 * que en `src/app/logbook/build-resilience.test.tsx`: con `revalidate`, Next
 * prerenderiza esta página durante `next build` y ahí corre una query de
 * verdad, así que una base caída se llevaría puesto el deploy entero.
 *
 * La segunda es qué se lee. El número tiene que ir arriba del título y más
 * grande —es lo que se viene a ver—, y el cero de "todavía no entrené" tiene
 * que distinguirse de "no se pudieron cargar los contadores". Un cero es un
 * dato; mostrarlo cuando la base no respondió sería afirmar algo falso.
 */

const queries = vi.hoisted(() => ({
  shouldFail: false,
  totals: {} as ExerciseTotals,
}));

vi.mock("@/lib/stats/queries", () => ({
  currentWeekTotals: async () => {
    if (queries.shouldFail) throw new Error("relation does not exist");
    return queries.totals;
  },
}));

function totalsFixture(
  overrides: Partial<ExerciseTotals> = {},
): ExerciseTotals {
  return {
    pull_ups: 0,
    push_ups: 0,
    squats: 0,
    dips: 0,
    handstand_seconds: 0,
    pistol_squats: 0,
    ...overrides,
  };
}

/** Renderiza el Server Component resolviendo su promesa primero. */
async function renderPage() {
  const { default: StatsPage } = await import("./page");
  render(await StatsPage());
}

beforeEach(() => {
  queries.shouldFail = false;
  queries.totals = totalsFixture();
});

describe("/stats", () => {
  it("muestra los seis contadores con su total", async () => {
    queries.totals = totalsFixture({ pull_ups: 47, push_ups: 128 });
    await renderPage();

    expect(screen.getByText("Dominadas")).toBeInTheDocument();
    expect(screen.getByText("Sentadillas pistol")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("pone el número por encima del título", async () => {
    queries.totals = totalsFixture({ pull_ups: 47 });
    await renderPage();

    // Se compara la posición en el DOM y no las clases: lo que se está fijando
    // es el orden de lectura —primero el cuánto, después el qué—, que es lo
    // que se pidió y lo que un refactor de estilos podría dar vuelta sin
    // querer.
    const item = screen.getByText("Dominadas").closest("li");
    const orden = [...(item?.querySelectorAll("p, h2") ?? [])].map(
      (nodo) => nodo.tagName,
    );

    expect(orden).toEqual(["P", "H2"]);
  });

  it("dice de qué semana son los números", async () => {
    await renderPage();

    // Sin el rango, "47 dominadas" no significa nada: no se sabe si es de esta
    // semana, del mes o de siempre.
    expect(screen.getByText(/^Semana del /)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Lo que llevo esta semana. Los contadores vuelven a cero cada lunes.",
      ),
    ).toBeInTheDocument();
  });

  it("escribe el sufijo de segundos solo en el handstand", async () => {
    queries.totals = totalsFixture({ handstand_seconds: 215 });
    await renderPage();

    expect(screen.getAllByText("s")).toHaveLength(1);
    expect(screen.getByText("215")).toBeInTheDocument();
  });

  it("muestra ceros cuando la semana recién empieza", async () => {
    await renderPage();

    // Un lunes temprano los seis están en cero. Es un dato, no un fallo.
    expect(screen.getAllByText("0")).toHaveLength(6);
    expect(
      screen.queryByText("No se pudieron cargar los contadores."),
    ).toBeNull();
  });

  describe("cuando la base no responde", () => {
    beforeEach(() => {
      queries.shouldFail = true;
    });

    it("no propaga el error, para no voltear el build", async () => {
      const { default: StatsPage } = await import("./page");

      // Que resuelva ya es la aserción: si el error subiera, el build fallaría
      // acá igual que en Vercel.
      await expect(StatsPage()).resolves.toBeTruthy();
    });

    it("lo dice, en vez de mostrar seis ceros", async () => {
      await renderPage();

      expect(
        screen.getByText("No se pudieron cargar los contadores."),
      ).toBeInTheDocument();
      expect(screen.queryByText("0")).toBeNull();
    });
  });
});
