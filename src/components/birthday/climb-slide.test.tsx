import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClimbSlide } from "./climb-slide";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderClimb(initial: "going" | "not_going" | null, onGoing = vi.fn()) {
  render(
    <ClimbSlide
      token="Ab3dEf6hIj9L"
      event="hike"
      color="#3F2D5C"
      initial={initial}
      roki={null}
      onGoing={onGoing}
    />,
  );
  return onGoing;
}

describe("ClimbSlide", () => {
  it("parte en la base, con la altura del inicio", () => {
    renderClimb(null);
    expect(screen.getByText("880 m")).toBeInTheDocument();
    expect(screen.getByText(/Arrastra a tu roki/)).toBeInTheDocument();
  });

  it("si ya va, el roki está en la cumbre", () => {
    renderClimb("going");
    expect(screen.getByText("1.638 m")).toBeInTheDocument();
    expect(
      screen.getByText("¡llegaste! vas al manquehue :)"),
    ).toBeInTheDocument();
    expect(screen.queryByText("confirmar sin subir")).not.toBeInTheDocument();
  });

  it("confirmar sin subir dice voy y pide el roki", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ status: "going" }));
    vi.stubGlobal("fetch", fetchMock);
    const onGoing = renderClimb(null);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "confirmar sin subir" }),
      );
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      event: "hike",
      status: "going",
    });
    expect(onGoing).toHaveBeenCalled();
  });

  it("no voy no pide nada más", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status: "not_going" })),
    );
    const onGoing = renderClimb(null);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "no voy" }));
    });
    expect(onGoing).not.toHaveBeenCalled();
    expect(screen.getByText(/si cambias de opinión, sube/)).toBeInTheDocument();
  });
});
