import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExerciseTotals } from "@/lib/stats/queries";
import { ExerciseCounterGrid } from "./exercise-counter-grid";

/**
 * `next/navigation` no funciona fuera de un request de Next.
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

/**
 * Lo que se prueba acá es el comportamiento optimista, que es la razón por la
 * que este componente es de cliente.
 *
 * El número se mueve en el tap y no cuando responde el servidor: en el gimnasio
 * la señal es mala y esperar el round trip por cada repetición hace que la
 * pantalla se sienta rota. Lo que eso obliga a probar es lo que pasa cuando el
 * servidor **no** confirma: si un rechazo dejara el número subido, el panel
 * mostraría un total que la base no tiene, y yo seguiría contando desde ahí.
 */

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

/** Respuesta exitosa del handler, con el total ya recalculado. */
function okResponse(total: number) {
  return {
    ok: true,
    status: 201,
    json: async () => ({ event: { id: "x" }, total }),
  } as Response;
}

function errorResponse(status: number, error: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ExerciseCounterGrid", () => {
  it("muestra los seis ejercicios con su total", () => {
    render(
      <ExerciseCounterGrid
        initialTotals={totalsFixture({ pull_ups: 12, push_ups: 40 })}
      />,
    );

    for (const label of [
      "Dominadas",
      "Flexiones",
      "Sentadillas",
      "Fondos",
      "Handstand",
      "Sentadillas pistol",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("escribe el sufijo de segundos solo en el handstand", () => {
    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);

    // Un "60" pelado y un "60 s" no significan lo mismo, y el handstand es el
    // único que no se mide en repeticiones.
    expect(screen.getAllByText("s")).toHaveLength(1);
  });

  it("sube el número en el tap, sin esperar al servidor", async () => {
    // La promesa nunca se resuelve: si el número solo se moviera al responder,
    // este test se quedaría en 0.
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar en Dominadas" }));

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("manda la dirección, no la cantidad", async () => {
    fetchMock.mockResolvedValue(okResponse(1));

    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar en Fondos" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/stats",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ exercise: "dips", direction: "up" }),
        }),
      );
    });
  });

  it("adopta el total que devuelve el servidor", async () => {
    // El panel puede estar desincronizado —otra pestaña, un tap perdido—, así
    // que la respuesta manda sobre el número optimista.
    fetchMock.mockResolvedValue(okResponse(7));

    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar en Dominadas" }));

    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  it("no deja restar cuando el contador está en cero", () => {
    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);

    // El servidor igual lo rechaza, pero enterarse por un mensaje de error de
    // algo que se puede ver en el botón es peor.
    expect(
      screen.getByRole("button", { name: "Restar en Dominadas" }),
    ).toBeDisabled();
  });

  it("habilita el menos apenas hay algo que restar", () => {
    render(
      <ExerciseCounterGrid initialTotals={totalsFixture({ squats: 3 })} />,
    );

    expect(
      screen.getByRole("button", { name: "Restar en Sentadillas" }),
    ).toBeEnabled();
  });

  describe("cuando el servidor rechaza el tap", () => {
    it("devuelve el número a donde estaba", async () => {
      fetchMock.mockResolvedValue(
        errorResponse(409, "El contador ya está en cero."),
      );

      render(
        <ExerciseCounterGrid initialTotals={totalsFixture({ pull_ups: 5 })} />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Sumar en Dominadas" }),
      );

      // Si el 6 quedara en pantalla, yo seguiría contando desde un número que
      // la base no tiene.
      await waitFor(() => {
        expect(screen.getByText("5")).toBeInTheDocument();
      });
      expect(screen.queryByText("6")).toBeNull();
    });

    it("dice qué pasó", async () => {
      fetchMock.mockResolvedValue(
        errorResponse(409, "El contador ya está en cero."),
      );

      render(
        <ExerciseCounterGrid initialTotals={totalsFixture({ pull_ups: 5 })} />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Sumar en Dominadas" }),
      );

      expect(
        await screen.findByText("El contador ya está en cero."),
      ).toBeInTheDocument();
    });
  });

  it("avisa y revierte cuando no hay conexión", async () => {
    // El caso real: el celular en el gimnasio se queda sin señal a mitad de la
    // serie. `fetch` no devuelve una respuesta, tira.
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<ExerciseCounterGrid initialTotals={totalsFixture({ dips: 2 })} />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar en Fondos" }));

    expect(
      await screen.findByText("Sin conexión. Ese toque no se guardó."),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("manda al login cuando la sesión venció", async () => {
    fetchMock.mockResolvedValue(errorResponse(401, "No autorizado."));

    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar en Dominadas" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/admin/login");
    });
  });

  it("cuenta bien varios taps seguidos", async () => {
    // El caso de uso literal: una serie de diez. Cada tap es un request, y las
    // respuestas pueden llegar desordenadas; el número no puede perder ninguno
    // ni saltar hacia atrás.
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<ExerciseCounterGrid initialTotals={totalsFixture()} />);
    const boton = screen.getByRole("button", { name: "Sumar en Dominadas" });

    for (let i = 0; i < 10; i++) {
      fireEvent.click(boton);
    }

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
});
