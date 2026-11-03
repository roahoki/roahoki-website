import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COCKTAIL_PHOTO_SRC, CocktailPhoto } from "./cocktail-photo";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubFetch() {
  const fetch = vi.fn().mockResolvedValue(new Response(new Blob(["png"])));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("CocktailPhoto", () => {
  it("muestra la foto del cóctel y la trae antes del toque", async () => {
    const fetch = stubFetch();
    await act(async () => {
      render(<CocktailPhoto />);
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", COCKTAIL_PHOTO_SRC);
    expect(fetch).toHaveBeenCalledWith(COCKTAIL_PHOTO_SRC, expect.anything());
  });

  it("compartir abre el menú del sistema con la foto", async () => {
    stubFetch();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { canShare: () => true, share });

    await act(async () => {
      render(<CocktailPhoto />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "compartir" }));
    });
    const [{ files }] = share.mock.calls[0];
    expect(files[0].name).toBe("coctel-joky.png");
  });

  it("donde no se pueden compartir archivos, compartir descarga", async () => {
    stubFetch();
    Object.assign(navigator, { canShare: () => false });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    await act(async () => {
      render(<CocktailPhoto />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "compartir" }));
    });
    expect(click).toHaveBeenCalled();
  });
});
