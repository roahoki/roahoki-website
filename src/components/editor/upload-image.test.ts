import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "./upload-image";

/** Un `XMLHttpRequest` mínimo que responde lo que el test le diga. */
class FakeXhr {
  static last: FakeXhr;
  status = 0;
  response: unknown = null;
  url = "";
  body: FormData | null = null;
  private listeners: Record<string, () => void> = {};
  upload = {
    listeners: {} as Record<string, (event: ProgressEvent) => void>,
    addEventListener(name: string, fn: (event: ProgressEvent) => void) {
      this.listeners[name] = fn;
    },
  };

  constructor() {
    FakeXhr.last = this;
  }
  open(_method: string, url: string) {
    this.url = url;
  }
  addEventListener(name: string, fn: () => void) {
    this.listeners[name] = fn;
  }
  send(body: FormData) {
    this.body = body;
  }

  progress(loaded: number, total: number) {
    this.upload.listeners.progress?.({
      lengthComputable: true,
      loaded,
      total,
    } as ProgressEvent);
  }
  respond(status: number, response: unknown) {
    this.status = status;
    this.response = response;
    this.listeners.load?.();
  }
  fail() {
    this.listeners.error?.();
  }
}

const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

afterEach(() => vi.unstubAllGlobals());

describe("uploadImage", () => {
  it("envía el archivo, informa el avance y devuelve la URL", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const onProgress = vi.fn();

    const result = uploadImage(file, onProgress);
    FakeXhr.last.progress(30, 100);
    FakeXhr.last.respond(201, { url: "https://cdn.test/a.jpg" });

    await expect(result).resolves.toBe("https://cdn.test/a.jpg");
    expect(FakeXhr.last.url).toBe("/api/admin/logbook/images");
    expect(FakeXhr.last.body?.get("file")).toBeInstanceOf(File);
    expect(onProgress).toHaveBeenCalledWith(30);
  });

  it("rechaza con el error de la API", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);

    const result = uploadImage(file, vi.fn());
    FakeXhr.last.respond(400, {
      error: "La imagen no puede pesar más de 4 MB.",
    });

    await expect(result).rejects.toThrow(
      "La imagen no puede pesar más de 4 MB.",
    );
  });

  it("avisa si la sesión expiró o si se cortó la conexión", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);

    const expired = uploadImage(file, vi.fn());
    FakeXhr.last.respond(401, { error: "No autorizado." });
    await expect(expired).rejects.toThrow("la sesión expiró");

    const offline = uploadImage(file, vi.fn());
    FakeXhr.last.fail();
    await expect(offline).rejects.toThrow("revisa la conexión");
  });
});
