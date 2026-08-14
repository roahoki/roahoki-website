import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `revalidatePath` es de Next y necesita el contexto de un request, así que se
 * sustituye: lo que importa acá no es que Next invalide, sino **qué rutas se le
 * piden**. Una ruta de menos es una página que sigue sirviendo contenido viejo,
 * y eso no se ve hasta que alguien la abre.
 */
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

const { revalidateLogbook } = await import("./revalidate");

/** Las rutas pedidas, en orden y sin el segundo argumento de `revalidatePath`. */
function revalidatedPaths(): string[] {
  return revalidatePath.mock.calls.map(([path]) => path as string);
}

beforeEach(() => {
  revalidatePath.mockClear();
});

describe("revalidateLogbook", () => {
  it("siempre invalida el listado", () => {
    revalidateLogbook();

    expect(revalidatedPaths()).toEqual(["/logbook"]);
  });

  it("invalida el listado y la nota", () => {
    revalidateLogbook("una-nota");

    expect(revalidatedPaths()).toEqual(["/logbook", "/logbook/una-nota"]);
  });

  it("invalida las dos rutas cuando el slug cambió", () => {
    revalidateLogbook("slug-nuevo", "slug-viejo");

    // La vieja también: su página se prerenderizó con la nota adentro y sin
    // invalidarla seguiría sirviéndola después del renombre.
    expect(revalidatedPaths()).toEqual([
      "/logbook",
      "/logbook/slug-nuevo",
      "/logbook/slug-viejo",
    ]);
  });

  it("no repite la ruta cuando el slug no cambió", () => {
    revalidateLogbook("misma-nota", "misma-nota");

    expect(revalidatedPaths()).toEqual(["/logbook", "/logbook/misma-nota"]);
  });

  it("ignora los slugs ausentes", () => {
    revalidateLogbook("una-nota", undefined, null);

    expect(revalidatedPaths()).toEqual(["/logbook", "/logbook/una-nota"]);
  });
});
