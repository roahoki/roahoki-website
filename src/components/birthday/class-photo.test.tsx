import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassPhoto } from "./class-photo";

const CATA = { id: "a", name: "cata", roki: null };
const PANCHO = { id: "b", name: "pancho", roki: null };

describe("ClassPhoto", () => {
  it("un roki con su nombre por cada uno que va", () => {
    render(<ClassPhoto attendees={[CATA, PANCHO]} color="#173F2A" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("cata")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "el roki de pancho" }),
    ).toBeVisible();
  });

  it("en el panel, cada roki lleva a la ficha del invitado", () => {
    render(
      <ClassPhoto
        attendees={[CATA, PANCHO]}
        color="#173F2A"
        hrefFor={(guest) => `/admin/cumple/guests/${guest.id}`}
      />,
    );
    expect(screen.getByRole("link", { name: /cata/ })).toHaveAttribute(
      "href",
      "/admin/cumple/guests/a",
    );
  });

  it("en la página del invitado, su roki dice tú y se toca para dibujarlo", () => {
    const onTapMine = vi.fn();
    render(
      <ClassPhoto
        attendees={[CATA, PANCHO]}
        color="#173F2A"
        meId="a"
        onTapMine={onTapMine}
      />,
    );
    expect(screen.getByText("tú")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "dibujar tu roki" }));
    expect(onTapMine).toHaveBeenCalled();
    // Los demás no se tocan.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
