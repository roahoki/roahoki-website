import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsappRsvpsPanel } from "./whatsapp-rsvps-panel";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ID = "5b9d1a5e-3f6c-4f2b-9a11-2c3d4e5f6a7b";
const CARMEN = { id: ID, name: "tía Carmen", partySize: 3 };

function stubFetch(response = new Response("{}", { status: 200 })) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => refresh.mockClear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WhatsappRsvpsPanel", () => {
  it("sin nadie anotado, explica para qué es", () => {
    render(<WhatsappRsvpsPanel event="cocktail" rsvps={[]} />);
    expect(screen.getByText(/Nadie anotado todavía/)).toBeInTheDocument();
  });

  it("anota un grupo con nombre y cuántos vienen", async () => {
    const fetch = stubFetch(new Response("{}", { status: 201 }));
    render(<WhatsappRsvpsPanel event="cocktail" rsvps={[]} />);
    fireEvent.change(screen.getByLabelText("nombre"), {
      target: { value: "tía Carmen" },
    });
    fireEvent.change(screen.getByLabelText("cuántos vienen"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "anotar" }));
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/admin/birthday/whatsapp-rsvps");
    expect(JSON.parse(init.body)).toEqual({
      event: "cocktail",
      name: "tía Carmen",
      partySize: 3,
    });
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByLabelText("nombre")).toHaveValue("");
  });

  it("sin nombre no manda nada y dice qué falta", async () => {
    const fetch = stubFetch();
    render(<WhatsappRsvpsPanel event="cocktail" rsvps={[]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "anotar" }));
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Falta el nombre.");
  });

  it("+ suma uno al toque y lo guarda", async () => {
    const fetch = stubFetch();
    render(<WhatsappRsvpsPanel event="cocktail" rsvps={[CARMEN]} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "uno más en tía Carmen" }),
      );
    });
    expect(screen.getByLabelText("tía Carmen: 4")).toBeInTheDocument();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`/api/admin/birthday/whatsapp-rsvps/${ID}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ partySize: 4 });
  });

  it("si no se guarda, el número vuelve atrás y avisa", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "No se pudo guardar." }), {
        status: 500,
      }),
    );
    render(<WhatsappRsvpsPanel event="cocktail" rsvps={[CARMEN]} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "uno menos en tía Carmen" }),
      );
    });
    expect(screen.getByLabelText("tía Carmen: 3")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar.");
  });

  it("con uno solo, − no baja a cero: para sacarlo está ×", () => {
    render(
      <WhatsappRsvpsPanel
        event="cocktail"
        rsvps={[{ ...CARMEN, partySize: 1 }]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "uno menos en tía Carmen" }),
    ).toBeDisabled();
  });

  it("× pregunta antes de sacar al grupo", async () => {
    const fetch = stubFetch(new Response(null, { status: 204 }));
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    render(<WhatsappRsvpsPanel event="cocktail" rsvps={[CARMEN]} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "sacar a tía Carmen" }),
      );
    });
    expect(confirm).toHaveBeenCalled();
    expect(fetch.mock.calls[0][1].method).toBe("DELETE");
    expect(refresh).toHaveBeenCalled();
  });
});
