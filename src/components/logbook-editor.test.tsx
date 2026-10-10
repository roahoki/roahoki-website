import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogbookEntry } from "@/db/schema";
import { AUTOSAVE_DELAY_MS, LogbookEditor } from "./logbook-editor";

/**
 * `next/navigation` no funciona fuera de un request de Next. Los `fetch` se
 * sustituyen: guardar de verdad pasa por la API, que tiene sus propios tests.
 */
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// La subida real va por XHR y tiene su propio test; acá importa qué hace el
// editor mientras espera.
const uploads = vi.hoisted(() => ({
  resolve: [] as ((url: string) => void)[],
}));
vi.mock("./editor/upload-image", () => ({
  uploadImage: () =>
    new Promise<string>((resolve) => uploads.resolve.push(resolve)),
}));

function entryFixture(overrides: Partial<LogbookEntry> = {}): LogbookEntry {
  return {
    id: "3f4a9d2e-1b6c-4c0a-9f5e-7d8a2b1c3e4f",
    slug: "una-nota",
    title: "Una nota",
    summary: "Un resumen",
    bodyMd: "# Hola\n\nUn cuerpo.",
    coverImageUrl: null,
    coverFocus: "center",
    format: "update",
    number: 27,
    tags: ["rails", "postgres"],
    status: "published",
    publishedAt: "2026-10-03T12:00:00.000Z",
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...overrides,
  };
}

const fetchMock = vi.fn();

function respondWith(entry: LogbookEntry) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ entry }),
  });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url, method: init?.method, body: JSON.parse(init?.body ?? "{}") };
}

// El editor se crea después del primer render (`immediatelyRender: false`).
async function editorReady() {
  await waitFor(() =>
    expect(screen.getByLabelText("cuerpo de la nota")).toBeInTheDocument(),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  router.push.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LogbookEditor — nota nueva", () => {
  it("arranca vacía y sin publicar", async () => {
    render(<LogbookEditor />);
    await editorReady();

    expect(screen.getByPlaceholderText("título")).toHaveValue("");
    expect(screen.getByText("nota nueva")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "publicar" }),
    ).not.toHaveLength(0);
  });

  it("Ctrl S la guarda como borrador sin salir del editor", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    respondWith(entryFixture({ status: "draft", id: "nueva-id" }));
    render(<LogbookEditor />);
    await editorReady();

    fireEvent.change(screen.getByPlaceholderText("título"), {
      target: { value: "la segunda manga" },
    });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() =>
      expect(
        screen.getByText("borrador · guardado recién"),
      ).toBeInTheDocument(),
    );
    expect(lastRequest()).toMatchObject({
      url: "/api/admin/logbook",
      method: "POST",
      body: { title: "la segunda manga", status: "draft" },
    });
    expect(router.push).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/admin/logbook/nueva-id",
    );
  });

  it("publicar la publica y vuelve a la lista", async () => {
    respondWith(entryFixture());
    render(<LogbookEditor />);
    await editorReady();

    fireEvent.click(screen.getAllByRole("button", { name: "publicar" })[0]);

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/logbook"),
    );
    expect(lastRequest().body.status).toBe("published");
  });

  it("muestra el error de la API sin salir", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Ya existe una nota con ese slug." }),
    });
    render(<LogbookEditor />);
    await editorReady();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una nota con ese slug.",
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("LogbookEditor — editando", () => {
  it("muestra número, formato, título y guardar", async () => {
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();

    expect(screen.getByText("#27")).toBeInTheDocument();
    expect(screen.getByText("un update")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("título")).toHaveValue("Una nota");
    expect(screen.getAllByRole("button", { name: "guardar" })).not.toHaveLength(
      0,
    );
  });

  // El cuerpo se edita visual pero se guarda como markdown: la base y la
  // página pública no se enteran del cambio de editor.
  it("guarda el cuerpo como markdown, con PATCH", async () => {
    respondWith(entryFixture());
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastRequest()).toMatchObject({
      url: "/api/admin/logbook/3f4a9d2e-1b6c-4c0a-9f5e-7d8a2b1c3e4f",
      method: "PATCH",
      body: { bodyMd: "# Hola\n\nUn cuerpo.", status: "published" },
    });
  });

  it("datos abre el panel con lo que ya tiene la nota", async () => {
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();

    fireEvent.click(screen.getAllByRole("button", { name: "datos" })[0]);
    const panel = screen.getByRole("dialog", { name: "datos de la nota" });

    expect(
      within(panel).getByRole("button", { name: "un update" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByText("#27")).toBeInTheDocument();
    expect(within(panel).getByText("3 oct 2026")).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "quitar rails" }),
    ).toBeInTheDocument();
    expect(within(panel).getByLabelText(/resumen/)).toHaveValue("Un resumen");
    expect(within(panel).getByText("/logbook/una-nota")).toBeInTheDocument();
    // Sin foto, la caja invita a subir una y avisa qué muestra la tarjeta.
    expect(
      within(panel).getByRole("button", { name: "subir la foto de portada" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("sin foto, la tarjeta muestra el número"),
    ).toBeInTheDocument();
  });

  it("lo que se cambia en el panel viaja al guardar", async () => {
    respondWith(entryFixture());
    render(
      <LogbookEditor
        entry={entryFixture({ coverImageUrl: "https://cdn.test/portada.jpg" })}
      />,
    );
    await editorReady();
    fireEvent.click(screen.getAllByRole("button", { name: "datos" })[0]);
    const panel = screen.getByRole("dialog", { name: "datos de la nota" });

    fireEvent.click(within(panel).getByRole("button", { name: "proyecto" }));
    fireEvent.click(within(panel).getByRole("button", { name: "arriba" }));
    fireEvent.click(
      within(panel).getByRole("button", { name: "quitar rails" }),
    );
    fireEvent.click(within(panel).getByRole("button", { name: "+ agregar" }));
    const tagInput = within(panel).getByLabelText("nuevo tag");
    fireEvent.change(tagInput, { target: { value: "Costura, la prenda" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    fireEvent.click(within(panel).getByRole("button", { name: "cambiar" }));
    fireEvent.change(within(panel).getByLabelText("fecha"), {
      target: { value: "2026-09-24" },
    });

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(lastRequest().body).toMatchObject({
      format: "project",
      coverFocus: "top",
      coverImageUrl: "https://cdn.test/portada.jpg",
      tags: ["postgres", "costura", "la prenda"],
      publishedAt: "2026-09-24T12:00:00.000Z",
    });
  });

  it("tocar el formato elegido lo quita, y quitar la foto la borra", async () => {
    respondWith(entryFixture());
    render(
      <LogbookEditor
        entry={entryFixture({ coverImageUrl: "https://cdn.test/portada.jpg" })}
      />,
    );
    await editorReady();
    fireEvent.click(screen.getAllByRole("button", { name: "datos" })[0]);
    const panel = screen.getByRole("dialog", { name: "datos de la nota" });

    fireEvent.click(within(panel).getByRole("button", { name: "un update" }));
    fireEvent.click(
      within(panel).getByRole("button", { name: "quitar la foto de portada" }),
    );
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(lastRequest().body).toMatchObject({
      format: null,
      coverImageUrl: null,
    });
    // Sin cambiar la fecha, no se manda: queda la que tenía.
    expect(lastRequest().body).not.toHaveProperty("publishedAt");
  });

  it("la foto de portada se sube desde el panel", async () => {
    uploads.resolve = [];
    respondWith(entryFixture());
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();
    fireEvent.click(screen.getAllByRole("button", { name: "datos" })[0]);
    const panel = screen.getByRole("dialog", { name: "datos de la nota" });

    fireEvent.change(within(panel).getByLabelText("foto de portada"), {
      target: {
        files: [new File(["a"], "portada.jpg", { type: "image/jpeg" })],
      },
    });
    await waitFor(() => expect(uploads.resolve).toHaveLength(1));
    uploads.resolve[0]("https://cdn.test/portada.jpg");

    // Con foto aparecen el foco y las acciones sobre la foto.
    expect(
      await within(panel).findByRole("button", { name: "centro" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(panel).getByRole("button", { name: "cambiar foto" }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "subir la foto de portada" }),
    ).toBeNull();
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastRequest().body.coverImageUrl).toBe(
      "https://cdn.test/portada.jpg",
    );
  });

  it("la foto de portada también se puede soltar sobre la caja vacía", async () => {
    uploads.resolve = [];
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();
    fireEvent.click(screen.getAllByRole("button", { name: "datos" })[0]);
    const panel = screen.getByRole("dialog", { name: "datos de la nota" });

    fireEvent.drop(
      within(panel).getByRole("button", { name: "subir la foto de portada" }),
      {
        dataTransfer: {
          files: [new File(["a"], "portada.jpg", { type: "image/jpeg" })],
        },
      },
    );

    await waitFor(() => expect(uploads.resolve).toHaveLength(1));
  });

  it("Esc cierra el panel", async () => {
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();

    fireEvent.click(screen.getAllByRole("button", { name: "datos" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Ctrl / abre los atajos y Esc los cierra", async () => {
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();

    fireEvent.keyDown(window, { key: "/", ctrlKey: true });
    const dialog = screen.getByRole("dialog", { name: "atajos" });
    expect(dialog).toHaveTextContent("Ctrl Alt 2");
    expect(dialog).not.toHaveTextContent("Ctrl I");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("LogbookEditor — fotos", () => {
  it("foto sube varias imágenes y no deja publicar hasta que terminan", async () => {
    uploads.resolve = [];
    respondWith(entryFixture({ status: "draft" }));
    render(<LogbookEditor entry={entryFixture({ status: "draft" })} />);
    await editorReady();

    fireEvent.change(screen.getByLabelText("foto"), {
      target: {
        files: [
          new File(["a"], "1.jpg", { type: "image/jpeg" }),
          new File(["b"], "2.jpg", { type: "image/jpeg" }),
        ],
      },
    });

    expect(await screen.findByText("subiendo 2 imágenes…")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "publicar" })) {
      expect(button).toBeDisabled();
    }

    uploads.resolve[0]("https://cdn.test/1.jpg");
    await waitFor(() => expect(uploads.resolve).toHaveLength(2));
    uploads.resolve[1]("https://cdn.test/2.jpg");

    await waitFor(() =>
      expect(screen.getByText("borrador · sin guardar")).toBeInTheDocument(),
    );
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastRequest().body.bodyMd).toContain(
      "![](https://cdn.test/1.jpg)\n\n![](https://cdn.test/2.jpg)",
    );
  });

  it("un archivo que no es imagen se explica y no se sube", async () => {
    uploads.resolve = [];
    render(<LogbookEditor />);
    await editorReady();

    fireEvent.change(screen.getByLabelText("foto"), {
      target: {
        files: [new File(["%PDF"], "cv.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "cv.pdf: solo imágenes.",
    );
    expect(uploads.resolve).toHaveLength(0);
  });
});

describe("LogbookEditor — guardado automático", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function typeTitle(value: string) {
    fireEvent.change(screen.getByPlaceholderText("título"), {
      target: { value },
    });
  }

  it("un borrador se guarda solo al dejar de escribir", async () => {
    respondWith(entryFixture({ status: "draft" }));
    render(<LogbookEditor entry={entryFixture({ status: "draft" })} />);
    await editorReady();

    typeTitle("Una nota, con otro título");
    expect(screen.getByText("borrador · sin guardar")).toBeInTheDocument();

    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 100);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(lastRequest()).toMatchObject({
      method: "PATCH",
      body: { title: "Una nota, con otro título", status: "draft" },
    });
    expect(
      await screen.findByText("borrador · guardado recién"),
    ).toBeInTheDocument();
  });

  // Cada guardado de una publicada cambia lo que ya se ve en el sitio.
  it("una nota publicada no se guarda sola", async () => {
    render(<LogbookEditor entry={entryFixture()} />);
    await editorReady();

    typeTitle("Otro título");
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("publicada · sin guardar")).toBeInTheDocument();
  });

  it("una nota nueva sin cuerpo todavía no se guarda", async () => {
    render(<LogbookEditor />);
    await editorReady();

    typeTitle("Solo el título");
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
