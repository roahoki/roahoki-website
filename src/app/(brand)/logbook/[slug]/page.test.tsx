import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LogbookEntry } from "@/db/schema";
import LogbookEntryPage, { generateMetadata } from "./page";

const COVER =
  "https://x.supabase.co/storage/v1/object/public/logbook-images/portada.jpg";
const BODY_IMAGE =
  "https://x.supabase.co/storage/v1/object/public/logbook-images/cuerpo.jpg";

const entry: LogbookEntry = {
  id: "3f4a9d2e-1b6c-4c0a-9f5e-7d8a2b1c3e4f",
  slug: "una-nota",
  title: "Una nota",
  summary: "Un resumen",
  bodyMd: `Un párrafo.\n\n![](${BODY_IMAGE})`,
  coverImageUrl: COVER,
  coverFocus: "center",
  coverCropX: 0.5,
  coverCropY: 0.5,
  coverZoom: 1,
  format: "update",
  number: 27,
  tags: [],
  status: "published",
  publishedAt: "2026-10-03T12:00:00.000Z",
  createdAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
};

vi.mock("@/lib/logbook/queries", () => ({
  getPublishedEntryBySlug: async () => entry,
  getEntryNeighbors: async () => ({ previous: undefined, next: undefined }),
  listPublishedSlugs: async () => [],
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/logbook/una-nota",
}));

const params = Promise.resolve({ slug: "una-nota" });

/**
 * La portada es de la tarjeta del home, no de la nota: lo que se ve arriba de
 * la nota es lo que se escribió en el cuerpo.
 */
describe("página de la nota", () => {
  it("no muestra la portada, solo las imágenes del cuerpo", async () => {
    const { container } = render(await LogbookEntryPage({ params }));
    const sources = [...container.querySelectorAll("img")].map((img) =>
      img.getAttribute("src"),
    );

    expect(sources).toContain(BODY_IMAGE);
    expect(sources).not.toContain(COVER);
  });

  // Al compartir el link, la vista previa es una tarjeta: ahí sí va.
  it("la portada sigue en la vista previa al compartir", async () => {
    const metadata = await generateMetadata({ params });
    expect(metadata.openGraph?.images).toEqual([COVER]);
  });
});
