import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eventBySlug } from "@/lib/birthday/events";
import { ScheduleImage } from "./og/schedule-image";
import { SaveImages } from "./save-images";

const TOKEN = "Ab3dEf6hIj9L";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SaveImages", () => {
  it("muestra las dos miniaturas: la invitación es de todos, el cronograma es suyo", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Blob(["png"]))),
    );
    const { container } = render(<SaveImages token={TOKEN} />);
    const sources = [...container.querySelectorAll("img")].map((img) =>
      img.getAttribute("src"),
    );
    expect(sources).toEqual([
      "/cumple/invitacion.png",
      `/cumple/${TOKEN}/cronograma.png`,
    ]);
  });

  it("guardar en fotos abre el menú de compartir con la imagen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Blob(["png"]))),
    );
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { canShare: () => true, share });

    render(<SaveImages token={TOKEN} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /cronograma/ }));
    });
    expect(
      screen.getByRole("dialog", { name: "tu cronograma" }),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "guardar en fotos" }));
    });
    const [{ files }] = share.mock.calls[0];
    expect(files[0].name).toBe("cronograma-25-joky.png");
  });

  it("donde no se pueden compartir archivos, descarga", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Blob(["png"]))),
    );
    Object.assign(navigator, { canShare: () => false });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<SaveImages token={TOKEN} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /invitación/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "guardar en fotos" }));
    });
    expect(click).toHaveBeenCalled();
  });
});

describe("ScheduleImage", () => {
  it("trae todos sus planes y roki asoma solo donde dijo voy", () => {
    const { container } = render(
      <ScheduleImage
        name="cata"
        roki={null}
        plans={[
          { plan: eventBySlug("run"), status: "going" },
          { plan: eventBySlug("party"), status: undefined },
          { plan: eventBySlug("hike"), status: "not_going" },
        ]}
      />,
    );
    expect(screen.getByText("cata, te espero en")).toBeInTheDocument();
    expect(screen.getByText("trote")).toBeInTheDocument();
    expect(screen.getByText("carrete")).toBeInTheDocument();
    expect(screen.getByText("21:00 · en mi casa")).toBeInTheDocument();
    // Una figura por plan confirmado, más la del logo del pie.
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });

  it("en los confirmados asoma el roki que dibujó, en papel", () => {
    const roki = {
      strokes: [
        {
          color: "#C42B1C" as const,
          points: [
            [0.2, 0.9],
            [0.5, 0.2],
            [0.8, 0.9],
          ] as [number, number][],
        },
      ],
      eye: null,
    };
    const { container } = render(
      <ScheduleImage
        name="cata"
        roki={roki}
        plans={[
          { plan: eventBySlug("run"), status: "going" },
          { plan: eventBySlug("party"), status: "going" },
          { plan: eventBySlug("hike"), status: undefined },
        ]}
      />,
    );
    const drawn = container.querySelectorAll('svg[viewBox="0 0 100 100"]');
    expect(drawn).toHaveLength(2);
    const path = drawn[0].querySelector("path");
    expect(path).toHaveAttribute("d", "M20.00 90.00 L50.00 20.00 L80.00 90.00");
    // Su rojo no se leería sobre el trote: va en papel.
    expect(drawn[0]).toHaveAttribute("stroke", "#EEECE3");
  });
});
