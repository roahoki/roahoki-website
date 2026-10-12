import { render } from "@testing-library/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PARALLAX_DRIFT } from "@/lib/motion/tokens";
import { mockMotion } from "@/test/motion";
import { ParallaxImages } from "./parallax-images";

/** Un cuerpo como el que arma `MarkdownContent`: la imagen en su párrafo. */
function renderBody() {
  const { container, unmount } = render(
    <ParallaxImages>
      <p>Un párrafo.</p>
      <p>
        {/* biome-ignore lint/performance/noImgElement: es lo que renderiza el markdown */}
        <img src="https://x.test/a.jpg" alt="" />
      </p>
    </ParallaxImages>,
  );
  const img = container.querySelector("img") as HTMLImageElement;
  return { img, unmount };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ParallaxImages", () => {
  it("con movimiento reducido deja las imágenes quietas", () => {
    mockMotion(false);
    const { img } = renderBody();

    expect(img.style.transform).toBe("");
  });

  // En happy-dom todo mide cero y la imagen queda arriba de la página, como
  // si ya la hubieran pasado. Lo que se prueba es que se corre, no hacia dónde.
  it("con movimiento la imagen se corre según el scroll", () => {
    mockMotion(true);
    const { img } = renderBody();

    expect(img.style.transform).toMatch(
      new RegExp(`translate\\(0px, -?${PARALLAX_DRIFT}px\\)`),
    );
  });

  it("vuelve a medir cuando termina de cargar una imagen", () => {
    mockMotion(true);
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
      false,
    );
    const refresh = vi.spyOn(ScrollTrigger, "refresh");
    const { img } = renderBody();
    refresh.mockClear();

    img.dispatchEvent(new Event("load"));

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("al desmontarse, la imagen vuelve a su lugar", () => {
    mockMotion(true);
    const { img, unmount } = renderBody();

    unmount();

    expect(img.style.transform).toBe("");
  });
});
