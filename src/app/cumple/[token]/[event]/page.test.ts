import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La URL vieja de cada plan ya no tiene página: lleva al ancla del plan en la
 * página del invitado, sin dejar de esconder los planes no invitados.
 */
const queries = vi.hoisted(() => ({ getGuestByToken: vi.fn() }));
vi.mock("@/lib/birthday/queries", () => queries);

// `redirect` y `notFound` cortan el render lanzando; acá se anota a dónde.
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/navigation", () => navigation);

const { default: Page } = await import("./page");

const TOKEN = "Ab3dEf6hIj9L";
const visit = (event: string, token = TOKEN) =>
  Page({ params: Promise.resolve({ token, event }) });

beforeEach(() => vi.clearAllMocks());

describe("/cumple/<token>/<plan>", () => {
  it("lleva al ancla del plan en la página del invitado", async () => {
    queries.getGuestByToken.mockResolvedValue({ invitedEvents: ["run"] });
    await expect(visit("trote")).rejects.toThrow(
      `redirect:/cumple/${TOKEN}#trote`,
    );
  });

  it("un plan no invitado sigue sin existir", async () => {
    queries.getGuestByToken.mockResolvedValue({ invitedEvents: ["run"] });
    await expect(visit("coctel")).rejects.toThrow("not-found");
  });

  it("un plan inventado o un token sin forma no consultan la base", async () => {
    await expect(visit("asado")).rejects.toThrow("not-found");
    await expect(visit("trote", "../admin")).rejects.toThrow("not-found");
    expect(queries.getGuestByToken).not.toHaveBeenCalled();
  });
});
