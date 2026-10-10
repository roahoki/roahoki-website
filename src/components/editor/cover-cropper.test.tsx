import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COVER_CROP } from "@/lib/logbook/cover-crop";
import { CoverCropper } from "./cover-cropper";

const URL =
  "https://xutwlpliollsczaatoxd.supabase.co/storage/v1/object/public/logbook-images/foto.jpg";

const preview = {
  number: 27,
  slug: "la-prenda",
  title: "la prenda, semana 5",
  summary: null,
  format: null,
  tags: [],
  publishedAt: "2026-10-07T12:00:00.000Z",
};

function setup(initial = DEFAULT_COVER_CROP) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  render(
    <CoverCropper
      url={URL}
      initial={initial}
      preview={preview}
      onDone={onDone}
      onCancel={onCancel}
    />,
  );
  return { onDone, onCancel };
}

/** happy-dom no carga imágenes: se simula una foto de celular apaisada 4:3. */
function loadPhoto() {
  const img = screen
    .getByRole("application")
    .querySelector("img") as HTMLImageElement;
  Object.defineProperty(img, "naturalWidth", { value: 4032 });
  Object.defineProperty(img, "naturalHeight", { value: 3024 });
  fireEvent.load(img);
}

afterEach(() => vi.restoreAllMocks());

describe("CoverCropper", () => {
  it("muestra la tarjeta del home con la foto", () => {
    setup();
    expect(
      screen.getByRole("dialog", { name: "ajustar portada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("la prenda, semana 5")).toBeInTheDocument();
  });

  it("listo devuelve el encuadre ajustado", () => {
    const { onDone } = setup();
    loadPhoto();
    const stage = screen.getByRole("application");

    // Una 4:3 sobra arriba y abajo: la flecha hacia abajo baja el encuadre.
    fireEvent.keyDown(stage, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("button", { name: "listo" }));

    const [crop] = onDone.mock.calls[0];
    expect(crop.y).toBeGreaterThan(0.5);
    expect(crop.x).toBe(0.5);
  });

  it("+ acerca y volver al centro deshace todo", () => {
    const { onDone } = setup();
    loadPhoto();
    const stage = screen.getByRole("application");

    fireEvent.keyDown(stage, { key: "+" });
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    fireEvent.click(screen.getByRole("button", { name: "volver al centro" }));
    fireEvent.click(screen.getByRole("button", { name: "listo" }));

    expect(onDone).toHaveBeenCalledWith(DEFAULT_COVER_CROP);
  });

  // El editor cierra el panel de datos con Esc escuchando en `window`: el Esc
  // del ajuste no tiene que llegarle.
  it("Esc cancela el ajuste sin cerrar lo que está detrás", () => {
    const behind = vi.fn();
    window.addEventListener("keydown", behind);
    const { onCancel, onDone } = setup();

    fireEvent.keyDown(screen.getByRole("application"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(behind).not.toHaveBeenCalled();
    window.removeEventListener("keydown", behind);
  });

  // La tarjeta de muestra no es un link de verdad: tocarla no navega.
  it("la tarjeta de muestra no se puede tocar", () => {
    setup();
    const link = screen.getByText("la prenda, semana 5").closest("a");
    expect(link?.closest("[inert]")).not.toBeNull();
  });
});
