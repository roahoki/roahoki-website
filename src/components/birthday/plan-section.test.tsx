import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eventBySlug } from "@/lib/birthday/events";
import { PlanSection } from "./plan-section";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// El recuadro de quiénes van tiene sus propios tests; acá basta saber que está.
vi.mock("./plan-response", () => ({
  PlanResponse: ({ plan }: { plan: { question: string } }) => (
    <p>{plan.question}</p>
  ),
}));

afterEach(() => vi.useRealTimers());

function renderPlan(album?: string) {
  return render(
    <PlanSection
      token="Ab3dEf6hIj9L"
      plan={eventBySlug("run")}
      status="going"
      attendees={[]}
      album={album}
      me={{ id: "me", roki: null }}
    />,
  );
}

describe("PlanSection", () => {
  it("es el ancla del plan y le da su color a la pantalla", () => {
    renderPlan();
    const section = screen.getByRole("region", { name: "trote" });
    expect(section).toHaveAttribute("id", "trote");
    expect(section).toHaveAttribute("data-backdrop", "#C42B1C");
    expect(screen.getByText("¿dónde nos juntamos?")).toBeInTheDocument();
    expect(screen.getByText("¿vas?")).toBeInTheDocument();
  });

  it("antes del plan no dice que ya pasó", () => {
    vi.useFakeTimers({ now: new Date("2026-11-01T12:00:00-03:00") });
    renderPlan();
    expect(screen.queryByText(/ya pasó/)).not.toBeInTheDocument();
  });

  it("al día siguiente muestra el álbum", () => {
    vi.useFakeTimers({ now: new Date("2026-11-09T12:00:00-03:00") });
    renderPlan("https://www.icloud.com/sharedalbum/#x");
    expect(screen.getByText("ya pasó · fuiste :)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ver las fotos" })).toHaveAttribute(
      "href",
      "https://www.icloud.com/sharedalbum/#x",
    );
  });
});
