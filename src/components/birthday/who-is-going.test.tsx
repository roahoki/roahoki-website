import { fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMotion } from "@/test/motion";
import { WhoIsGoing } from "./who-is-going";

// La física no corre en happy-dom (no hay layout ni requestAnimationFrame de
// verdad). Se reemplaza la pila por un doble que expone `shake`.
const shake = vi.hoisted(() => vi.fn());
vi.mock("./roki-pile", () => ({
  RokiPile: forwardRef(function FakePile(_props, ref) {
    useImperativeHandle(ref, () => ({ shake }));
    return <div data-testid="pila" />;
  }),
}));

const ATTENDEES = [
  { id: "me", name: "cata", roki: null },
  { id: "v", name: "vale", roki: null },
];

afterEach(() => {
  vi.restoreAllMocks();
  shake.mockClear();
});

function renderList(onTapMine = vi.fn()) {
  render(
    <WhoIsGoing
      attendees={ATTENDEES}
      meId="me"
      color="#C42B1C"
      onTapMine={onTapMine}
    />,
  );
  return onTapMine;
}

describe("WhoIsGoing", () => {
  it("parte en el montoncito y el terremoto sacude la pila", () => {
    mockMotion(true);
    renderList();
    expect(
      screen.getByRole("heading", { name: "montoncito" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pila")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /terremoto/ }));
    expect(shake).toHaveBeenCalled();
  });

  it("cambia de vista con las flechas, sin pasarse de los bordes", () => {
    mockMotion(true);
    renderList();
    expect(
      screen.getByRole("button", { name: "ver montoncito" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "ver foto de curso" }));
    expect(
      screen.getByRole("heading", { name: "foto de curso" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ver foto de curso" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /terremoto/ }),
    ).not.toBeInTheDocument();
  });

  it("cambia de vista deslizando fuera de la pila", () => {
    mockMotion(true);
    renderList();
    const nav = screen.getByRole("navigation", { name: "cambiar de vista" });
    fireEvent.pointerDown(nav, { clientX: 300 });
    fireEvent.pointerUp(nav, { clientX: 150 });
    expect(
      screen.getByRole("heading", { name: "foto de curso" }),
    ).toBeInTheDocument();
  });

  it("con movimiento reducido parte en la foto de curso, que no se mueve", () => {
    mockMotion(false);
    renderList();
    expect(
      screen.getByRole("heading", { name: "foto de curso" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("pila")).not.toBeInTheDocument();
  });

  it("en la foto de curso, tocar su roki abre el dibujo", () => {
    mockMotion(false);
    const onTapMine = renderList();
    fireEvent.click(screen.getByRole("button", { name: "dibujar tu roki" }));
    expect(onTapMine).toHaveBeenCalled();
  });

  it("suma una lámina al principio, como la cumbre del Manquehue", () => {
    mockMotion(false);
    render(
      <WhoIsGoing
        attendees={ATTENDEES}
        meId="me"
        color="#3F2D5C"
        onTapMine={vi.fn()}
        lead={{ title: "la cumbre", content: <p>el cerro</p> }}
      />,
    );
    // Parte en la cumbre aunque el movimiento esté reducido.
    expect(
      screen.getByRole("heading", { name: "la cumbre" }),
    ).toBeInTheDocument();
    expect(screen.getByText("el cerro")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ver montoncito" }));
    expect(
      screen.getByRole("heading", { name: "montoncito" }),
    ).toBeInTheDocument();
  });

  it("sin nadie todavía, guarda el lugar de los rokis en ambas vistas", () => {
    mockMotion(true);
    render(
      <WhoIsGoing
        attendees={[]}
        meId="me"
        color="#C42B1C"
        onTapMine={vi.fn()}
      />,
    );
    // Uno por vista, y la que no se ve queda inerte.
    const empty = screen.getAllByText(
      "acá van cayendo los rokis de quienes van",
    );
    expect(empty).toHaveLength(2);
    expect(empty[0].closest("[inert]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ver foto de curso" }));
    expect(empty[1].closest("[inert]")).toBeNull();
    expect(empty[0].closest("[inert]")).not.toBeNull();
  });

  it("la vista que no se ve sigue ocupando su lugar, oculta", () => {
    mockMotion(true);
    const { container } = render(
      <WhoIsGoing
        attendees={ATTENDEES}
        meId="me"
        color="#C42B1C"
        onTapMine={vi.fn()}
        lead={{ title: "la cumbre", content: <p>el cerro</p> }}
      />,
    );
    // Las tres vistas están en el DOM; solo una se ve. Así el recuadro mide lo
    // que la más alta y no salta al cambiar.
    const layers = container.querySelectorAll("[inert]");
    expect(layers).toHaveLength(2);
    for (const layer of layers) expect(layer.className).toContain("invisible");
    expect(container.querySelector("ul")).not.toBeNull();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
