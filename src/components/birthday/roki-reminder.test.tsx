import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMotion } from "@/test/motion";
import { RokiReminder, reminderText } from "./roki-reminder";

const RUN = { path: "trote", title: "trote" };
const PARTY = { path: "carrete", title: "carrete" };

const scrolled: string[] = [];

beforeEach(() => {
  scrolled.length = 0;
  document.body.innerHTML = "";
  // El trote ya quedó arriba de la pantalla; el carrete, más abajo.
  for (const [path, top] of [
    ["trote", -200],
    ["carrete", 900],
  ] as const) {
    const section = document.createElement("section");
    section.id = path;
    section.getBoundingClientRect = () => ({ top }) as DOMRect;
    section.scrollIntoView = () => scrolled.push(path);
    document.body.append(section);
  }
});

afterEach(() => vi.useRealTimers());

describe("reminderText", () => {
  it("dice cuántos faltan, o cuál si es uno", () => {
    expect(reminderText([RUN, PARTY])).toBe("te faltan 2 por confirmar :)");
    expect(reminderText([PARTY])).toBe("te falta confirmar el carrete :)");
    expect(reminderText([])).toBe("¡listo! gracias :)");
  });
});

describe("RokiReminder", () => {
  it("si ya estaba todo respondido, no aparece", () => {
    const { container } = render(<RokiReminder pending={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tocarlo baja al siguiente plan sin responder que está más abajo", () => {
    mockMotion(true);
    render(<RokiReminder pending={[RUN, PARTY]} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Ir al siguiente plan/ }),
    );
    expect(scrolled).toEqual(["carrete"]);
  });

  it("al responder el último dice listo y se va", () => {
    vi.useFakeTimers();
    const { rerender, container } = render(<RokiReminder pending={[PARTY]} />);
    rerender(<RokiReminder pending={[]} />);
    expect(screen.getByText("¡listo! gracias :)")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("vuelve si alguien cambia a sin responder", () => {
    vi.useFakeTimers();
    const { rerender } = render(<RokiReminder pending={[PARTY]} />);
    rerender(<RokiReminder pending={[]} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    rerender(<RokiReminder pending={[RUN]} />);
    expect(
      screen.getByText("te falta confirmar el trote :)"),
    ).toBeInTheDocument();
  });
});
