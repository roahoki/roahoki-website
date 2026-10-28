import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { metadata } from "@/app/cumple/layout";
import { ogFonts } from "@/lib/birthday/og-fonts";
import { Invitation } from "./invitation";
import { INVITATION_ROKIS } from "./invitation-pile";
import { ScratchAgainButton, ScratchGate } from "./scratch-gate";

// `next/font` solo existe dentro del compilador de Next; en Vitest no hay
// fuente que cargar, y al layout le basta con el nombre de la clase.
vi.mock("@/lib/fonts", () => ({ bricolage: { variable: "font-bricolage" } }));
// Los estilos los procesa Tailwind en el build; acá no hacen falta.
vi.mock("@/app/globals.css", () => ({}));

const TOKEN = "Ab3dEf6hIj9L";

describe("la invitación", () => {
  it("tacha roahoki y dice la fecha del cumple", () => {
    render(<Invitation />);
    expect(screen.getByText("roahoki").tagName).toBe("S");
    expect(
      screen.getByText(/mi cumple es el 4 de noviembre/),
    ).toBeInTheDocument();
  });

  it("trae los diez rokis de la invitación A de Figma", () => {
    expect(INVITATION_ROKIS).toHaveLength(10);
  });
});

describe("ScratchGate", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("si ya raspó, entra directo a la página con la tarjeta arriba", () => {
    render(
      <ScratchGate token={TOKEN} scratched card={<p>tarjeta</p>}>
        <p>el resto</p>
      </ScratchGate>,
    );
    expect(screen.getByText("el resto")).toBeInTheDocument();
    // La misma tarjeta, sin raspe encima: no se cambia por otra al destapar.
    expect(screen.getByText("tarjeta")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /Raspa acá/ }),
    ).not.toBeInTheDocument();
  });

  it("tapada recorta la tarjeta; destapada deja salir la pila por los lados", () => {
    const gate = (scratched: boolean) => (
      <ScratchGate token={TOKEN} scratched={scratched} card={<p>tarjeta</p>}>
        <p>el resto</p>
      </ScratchGate>
    );
    const frame = () =>
      (screen.getByText("tarjeta").parentElement as HTMLElement).style.clipPath;

    const covered = render(gate(false));
    expect(frame()).toContain("round 16px");
    covered.unmount();

    render(gate(true));
    expect(frame()).toContain("-20%");
  });

  it("raspar de nuevo solo existe dentro de la página destapada", () => {
    render(<ScratchAgainButton />);
    expect(
      screen.queryByRole("button", { name: "raspar de nuevo" }),
    ).not.toBeInTheDocument();
  });

  it("raspar de nuevo la vuelve a tapar sin tocar la base", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("scrollTo", vi.fn());

    render(
      <ScratchGate token={TOKEN} scratched card={<p>tarjeta</p>}>
        <p>el resto</p>
        <ScratchAgainButton />
      </ScratchGate>,
    );
    fireEvent.click(screen.getByRole("button", { name: "raspar de nuevo" }));
    expect(screen.queryByText("el resto")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Raspa acá/ })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "destapar la invitación" }),
    );
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText("el resto")).toBeInTheDocument();
    // Ya estaba raspada: no se vuelve a guardar.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si no, muestra solo la tarjeta y se puede destapar sin raspar", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ScratchGate token={TOKEN} scratched={false} card={<p>tarjeta</p>}>
        <p>el resto</p>
      </ScratchGate>,
    );
    expect(screen.getByText("tarjeta")).toBeInTheDocument();
    expect(screen.queryByText("el resto")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "destapar la invitación" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/birthday/scratch",
      expect.objectContaining({ body: JSON.stringify({ token: TOKEN }) }),
    );
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText("el resto")).toBeInTheDocument();
  });
});

describe("raíz /cumple", () => {
  it("no deja indexar nada", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("encuentra las fuentes de las imágenes", async () => {
    const fonts = await ogFonts();
    expect(fonts.map((font) => font.weight)).toEqual([400, 700]);
    for (const font of fonts)
      expect(font.data.byteLength).toBeGreaterThan(10_000);
  });
});
