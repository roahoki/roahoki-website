import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMotion } from "@/test/motion";
import { PlanResponse } from "./plan-response";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const PLAN = {
  slug: "run" as const,
  title: "trote",
  color: "#C42B1C",
  question: "¿vas?",
};
const ROKI = {
  strokes: [
    {
      color: "#101610" as const,
      points: [
        [0.1, 0.1],
        [0.5, 0.5],
      ] as [number, number][],
    },
  ],
  eye: null,
};

// La física no corre en happy-dom.
vi.mock("./roki-pile", () => ({ RokiPile: () => null }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function renderPlan(
  roki: typeof ROKI | null,
  attendees = [] as { id: string; name: string; roki: typeof ROKI | null }[],
) {
  return render(
    <PlanResponse
      token="Ab3dEf6hIj9L"
      plan={PLAN}
      status={null}
      passed={false}
      attendees={attendees}
      me={{ id: "me", roki }}
    />,
  );
}

describe("PlanResponse", () => {
  it("pide dibujar el roki la primera vez que dice voy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status: "going" })),
    );
    renderPlan(null);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "voy" }));
    });
    expect(
      screen.getByRole("dialog", { name: "dibuja tu roki" }),
    ).toBeInTheDocument();
    // Sin trazos no hay nada que guardar.
    expect(screen.getByRole("button", { name: "listo" })).toBeDisabled();
  });

  it("si ya tiene roki, el voy no abre la hoja", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status: "going" })),
    );
    renderPlan(ROKI);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "voy" }));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("con no voy nunca pide dibujar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status: "not_going" })),
    );
    renderPlan(null);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "no voy" }));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tocando su propio roki lo puede redibujar", () => {
    // En la foto de curso, que es la vista sin física.
    mockMotion(false);
    renderPlan(ROKI, [{ id: "me", name: "cata", roki: ROKI }]);
    fireEvent.click(screen.getByRole("button", { name: "redibujar tu roki" }));
    expect(
      screen.getByRole("dialog", { name: "redibuja tu roki" }),
    ).toBeInTheDocument();
    expect(screen.getByText("dejarlo como está")).toBeInTheDocument();
  });

  it("muestra «tú» en vez de su nombre", () => {
    mockMotion(false);
    renderPlan(null, [
      { id: "me", name: "cata", roki: null },
      { id: "v", name: "vale", roki: null },
    ]);
    expect(screen.getByText("tú")).toBeInTheDocument();
    expect(screen.getByText("vale")).toBeInTheDocument();
    expect(screen.queryByText("cata")).not.toBeInTheDocument();
  });
});
