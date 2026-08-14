import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Publicar tiene que invalidar el caché de las páginas públicas.
 *
 * `/logbook` y `/logbook/[slug]` son ISR: sirven el HTML que Next generó hasta
 * que vence `revalidate`. Escribir en la base no le avisa a nadie, así que si
 * un handler se olvida de revalidar, la nota existe pero **no se ve** — y el
 * síntoma aparece una hora después, lejos del cambio que lo causó. Por eso se
 * prueba en cada handler que muta, y no solo en el helper.
 *
 * Se sustituyen las queries y la autorización: lo que se verifica es qué rutas
 * se invalidan ante cada operación, no que Drizzle guarde ni que la sesión sea
 * válida —eso ya tiene sus propios tests—.
 */

const revalidatePath = vi.hoisted(() => vi.fn());
const queries = vi.hoisted(() => ({
  createEntry: vi.fn(),
  availableSlugFor: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  getEntryById: vi.fn(),
  listAllEntries: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: async () => null,
}));
vi.mock("@/lib/logbook/queries", () => queries);

const { POST } = await import("./route");
const { PATCH, DELETE } = await import("./[id]/route");

const ID = "5b9d1a5e-3f6c-4f2b-9a11-2c3d4e5f6a7b";

/** Las rutas invalidadas, que es lo único que miran estos tests. */
function revalidatedPaths(): string[] {
  return revalidatePath.mock.calls.map(([path]) => path as string);
}

function jsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/logbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

/** El segundo argumento que App Router le pasa a un handler con `[id]`. */
const routeParams = { params: Promise.resolve({ id: ID }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/logbook", () => {
  it("invalida el listado y la nota recién creada", async () => {
    queries.createEntry.mockResolvedValue({ id: ID, slug: "nota-nueva" });

    const response = await POST(
      jsonRequest({
        title: "Nota nueva",
        slug: "nota-nueva",
        bodyMd: "cuerpo",
      }),
    );

    expect(response.status).toBe(201);
    expect(revalidatedPaths()).toEqual(["/logbook", "/logbook/nota-nueva"]);
  });

  it("no invalida nada si el guardado falla", async () => {
    queries.createEntry.mockRejectedValue(new Error("se cayó la base"));

    const response = await POST(
      jsonRequest({ title: "Nota", slug: "nota", bodyMd: "cuerpo" }),
    );

    // Invalidar por una nota que no se guardó tira a la basura un caché válido
    // a cambio de nada.
    expect(response.status).toBe(500);
    expect(revalidatedPaths()).toEqual([]);
  });

  it("no invalida nada si el cuerpo es inválido", async () => {
    const response = await POST(jsonRequest({ title: "", bodyMd: "" }));

    expect(response.status).toBe(400);
    expect(queries.createEntry).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual([]);
  });
});

describe("PATCH /api/admin/logbook/[id]", () => {
  it("invalida el listado y la nota editada", async () => {
    queries.updateEntry.mockResolvedValue({ id: ID, slug: "una-nota" });

    const response = await PATCH(jsonRequest({ title: "Otro título" }), {
      ...routeParams,
    });

    expect(response.status).toBe(200);
    expect(revalidatedPaths()).toEqual(["/logbook", "/logbook/una-nota"]);
  });

  it("invalida también la URL vieja cuando se renombra el slug", async () => {
    queries.getEntryById.mockResolvedValue({ id: ID, slug: "slug-viejo" });
    queries.updateEntry.mockResolvedValue({ id: ID, slug: "slug-nuevo" });

    const response = await PATCH(jsonRequest({ slug: "slug-nuevo" }), {
      ...routeParams,
    });

    expect(response.status).toBe(200);
    // Sin la vieja, `/logbook/slug-viejo` seguiría sirviendo la nota aunque esa
    // URL ya no exista en la base.
    expect(revalidatedPaths()).toEqual([
      "/logbook",
      "/logbook/slug-nuevo",
      "/logbook/slug-viejo",
    ]);
  });

  it("no consulta el slug anterior si el cuerpo no trae uno nuevo", async () => {
    queries.updateEntry.mockResolvedValue({ id: ID, slug: "una-nota" });

    await PATCH(jsonRequest({ title: "Otro título" }), { ...routeParams });

    // Es el caso corriente —editar el cuerpo— y no debe costar una query extra.
    expect(queries.getEntryById).not.toHaveBeenCalled();
  });

  it("no invalida nada si la nota no existe", async () => {
    queries.updateEntry.mockResolvedValue(undefined);

    const response = await PATCH(jsonRequest({ title: "Otro título" }), {
      ...routeParams,
    });

    expect(response.status).toBe(404);
    expect(revalidatedPaths()).toEqual([]);
  });
});

describe("DELETE /api/admin/logbook/[id]", () => {
  it("invalida el listado y la nota borrada", async () => {
    queries.deleteEntry.mockResolvedValue("nota-borrada");

    const response = await DELETE(jsonRequest({}), { ...routeParams });

    expect(response.status).toBe(200);
    // Sin esto, borrar deja la nota visible en su URL hasta que venza el ISR:
    // se borra algo y sigue público.
    expect(revalidatedPaths()).toEqual(["/logbook", "/logbook/nota-borrada"]);
  });

  it("no invalida nada si la nota no existía", async () => {
    queries.deleteEntry.mockResolvedValue(undefined);

    const response = await DELETE(jsonRequest({}), { ...routeParams });

    expect(response.status).toBe(404);
    expect(revalidatedPaths()).toEqual([]);
  });
});
