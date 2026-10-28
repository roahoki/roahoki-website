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
});
