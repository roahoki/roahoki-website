import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RokiFigure } from "./roki-figure";
import { RsvpButtons } from "./rsvp-buttons";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("RsvpButtons", () => {
  it("marca la respuesta al tocar y recarga la lista al guardarse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ status: "going" })),
    );
    render(
      <RsvpButtons
        token="Ab3dEf6hIj9L"
        event="run"
        color="#C42B1C"
        initial={null}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "voy" }));
    });
    expect(screen.getByRole("button", { name: "voy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("vuelve atrás y lo dice si no se guardó", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Ese plan ya pasó." }, { status: 409 }),
        ),
    );
    render(
      <RsvpButtons
        token="Ab3dEf6hIj9L"
        event="run"
        color="#C42B1C"
        initial="not_going"
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "voy" }));
    });
    expect(screen.getByRole("button", { name: "no voy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Ese plan ya pasó.");
  });
});

describe("RokiFigure", () => {
  it("dibuja el roki genérico cuando no hay dibujo", () => {
    const { container } = render(
      <RokiFigure roki={null} color="#3F2D5C" size={64} />,
    );
    expect(container.querySelectorAll("path")).toHaveLength(3);
    expect(container.querySelector("svg")).toHaveAttribute("stroke", "#3F2D5C");
  });

  it("dibuja los trazos del invitado y marca el ojo", () => {
    const { container } = render(
      <RokiFigure
        roki={{
          strokes: [
            {
              color: "#C42B1C",
              points: [
                [0.1, 0.1],
                [0.9, 0.9],
              ],
            },
            {
              color: "#101610",
              points: [
                [0.5, 0.2],
                [0.55, 0.3],
              ],
            },
          ],
          eye: 1,
        }}
        color="#3F2D5C"
        size={64}
        label="el roki de cata"
      />,
    );
    const lines = container.querySelectorAll("polyline");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveAttribute("points", "10,10 90,90");
    expect(lines[1]).toHaveAttribute("data-eye");
    expect(
      screen.getByRole("img", { name: "el roki de cata" }),
    ).toBeInTheDocument();
  });
});
