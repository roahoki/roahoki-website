import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFab } from "./admin-fab";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/logbook/la-prenda",
}));

const ENTRY = {
  id: "8f0c1c8e-3b1a-4c55-9a51-1f0a9f4e2b10",
  title: "la prenda",
};

function login() {
  // biome-ignore lint/suspicious/noDocumentCookie: así la escribe el login
  document.cookie = "admin_hint=1; path=/";
}

function button() {
  const fab = screen.getByRole("button", { name: "admin" });
  // happy-dom no implementa la captura del puntero; acá no hace falta.
  fab.setPointerCapture = () => {};
  return fab;
}

function tap(element: HTMLElement) {
  fireEvent.pointerDown(element, {
    button: 0,
    pointerId: 1,
    clientX: 300,
    clientY: 700,
  });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: 300, clientY: 700 });
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: limpiar entre tests
  document.cookie = "admin_hint=; max-age=0; path=/";
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AdminFab", () => {
  it("sin sesión de admin no aparece", () => {
    render(<AdminFab entry={ENTRY} />);
    expect(screen.queryByRole("button", { name: "admin" })).toBeNull();
  });

  it("tocarlo abre el menú con el panel y una nota nueva", async () => {
    login();
    render(<AdminFab />);
    tap(button());

    expect(
      await screen.findByRole("menuitem", { name: "panel" }),
    ).toHaveAttribute("href", "/admin");
    expect(
      screen.getByRole("menuitem", { name: "nueva nota" }),
    ).toHaveAttribute("href", "/admin/logbook/new");
    // Fuera de una nota no hay nada que editar.
    expect(screen.queryByRole("menuitem", { name: "editar" })).toBeNull();
  });

  it("en una nota suma editar, ocultar y eliminar", async () => {
    login();
    render(<AdminFab entry={ENTRY} />);
    tap(button());

    expect(
      await screen.findByRole("menuitem", { name: "editar" }),
    ).toHaveAttribute("href", `/admin/logbook/${ENTRY.id}`);
    expect(
      screen.getByRole("menuitem", { name: "ocultar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "eliminar" }),
    ).toBeInTheDocument();
  });

  it("arrastrarlo lo mueve, lo recuerda y no abre el menú", () => {
    login();
    render(<AdminFab />);
    const fab = button();

    fireEvent.pointerDown(fab, {
      button: 0,
      pointerId: 1,
      clientX: 300,
      clientY: 700,
    });
    fireEvent.pointerMove(fab, { pointerId: 1, clientX: 200, clientY: 400 });
    fireEvent.pointerUp(fab, { pointerId: 1, clientX: 200, clientY: 400 });

    const container = fab.closest("div") as HTMLElement;
    expect(container.style.right).toBe("120px");
    expect(container.style.bottom).toBe("320px");
    expect(
      JSON.parse(window.localStorage.getItem("roahoki:admin-fab") ?? ""),
    ).toEqual({
      right: 120,
      bottom: 320,
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ocultar pasa la nota a borrador y vuelve al home", async () => {
    login();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminFab entry={ENTRY} />);
    tap(button());

    await act(async () => {
      fireEvent.click(await screen.findByRole("menuitem", { name: "ocultar" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/logbook/${ENTRY.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    expect(push).toHaveBeenCalledWith("/");
  });

  it("eliminar pide confirmación y sin ella no hace nada", async () => {
    login();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    render(<AdminFab entry={ENTRY} />);
    tap(button());

    fireEvent.click(await screen.findByRole("menuitem", { name: "eliminar" }));

    expect(confirm).toHaveBeenCalledWith(
      "¿Eliminar «la prenda»? No se puede deshacer.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // La pista dura lo mismo que la sesión, pero la sesión se puede invalidar
  // antes (otra clave de firma): el botón tiene que decir qué pasó.
  it("con la sesión vencida avisa y ofrece entrar", async () => {
    login();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    render(<AdminFab entry={ENTRY} />);
    tap(button());

    await act(async () => {
      fireEvent.click(
        await screen.findByRole("menuitem", { name: "eliminar" }),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu sesión venció.",
    );
    expect(screen.getByRole("link", { name: "entrar" })).toHaveAttribute(
      "href",
      "/admin/login?next=%2Flogbook%2Fla-prenda",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
