import { describe, expect, it } from "vitest";
import { FakeStorage } from "./fake-storage";
import {
  BUCKETS,
  contentTypeFor,
  extensionOf,
  objectPath,
  StorageError,
} from "./types";

describe("extensionOf", () => {
  it.each([
    ["foto.jpg", "jpg"],
    ["foto.JPEG", "jpeg"],
    ["captura.PNG", "png"],
    ["imagen.con.puntos.webp", "webp"],
    ["  foto.png  ", "png"],
  ])("extrae la extensión de %s", (filename, expected) => {
    expect(extensionOf(filename)).toBe(expected);
  });

  // El código anterior hacía `filename.split(".").pop() ?? "jpg"`, que para un
  // archivo sin extensión devolvía el nombre entero, y para "" devolvía "jpg".
  it.each(["sin-extension", "", "   ", "archivo."])(
    "devuelve null para %s en vez de inventar una",
    (filename) => {
      expect(extensionOf(filename)).toBeNull();
    },
  );
});

describe("contentTypeFor", () => {
  it.each([
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["PNG", "image/png"],
    ["webp", "image/webp"],
  ])("mapea %s a %s", (extension, expected) => {
    expect(contentTypeFor(extension)).toBe(expected);
  });

  it("devuelve undefined para una extensión que no se acepta", () => {
    expect(contentTypeFor("exe")).toBeUndefined();
    expect(contentTypeFor("svg")).toBeUndefined();
  });
});

describe("objectPath", () => {
  const fixed = { now: () => 1_700_000_000_000, random: () => "abc123" };

  it("arma la ruta con timestamp, sufijo aleatorio y extensión", () => {
    expect(objectPath("jpg", fixed)).toBe("1700000000000-abc123.jpg");
  });

  it("antepone el prefijo cuando se da", () => {
    expect(objectPath("png", { ...fixed, prefix: "logbook" })).toBe(
      "logbook/1700000000000-abc123.png",
    );
  });

  it("normaliza la extensión a minúsculas", () => {
    expect(objectPath("JPG", fixed)).toBe("1700000000000-abc123.jpg");
  });

  // El nombre original no se reutiliza: dos personas subiendo "foto.jpg"
  // colisionarían, y el nombre lo controla quien sube.
  it("genera rutas distintas en llamadas sucesivas", () => {
    const paths = new Set(
      Array.from({ length: 50 }, () => objectPath("jpg", { prefix: "x" })),
    );

    expect(paths.size).toBe(50);
  });

  it("el timestamp va adelante, para que ordenar por nombre sea cronológico", () => {
    const older = objectPath("jpg", { now: () => 1000, random: () => "zzz" });
    const newer = objectPath("jpg", { now: () => 2000, random: () => "aaa" });

    expect([newer, older].sort()).toEqual([older, newer]);
  });
});

describe("FakeStorage", () => {
  it("guarda lo subido y devuelve una URL pública", async () => {
    const storage = new FakeStorage();

    const result = await storage.upload({
      bucket: BUCKETS.logbookImages,
      path: "nota/foto.png",
      body: new Blob(["contenido"]),
      contentType: "image/png",
    });

    expect(result.path).toBe("nota/foto.png");
    expect(result.url).toBe(
      "https://storage.test/logbook-images/nota/foto.png",
    );
    expect(storage.countIn(BUCKETS.logbookImages)).toBe(1);
  });

  it("publicUrl coincide con la URL que devuelve upload", async () => {
    const storage = new FakeStorage();
    const { url } = await storage.upload({
      bucket: BUCKETS.testimonialImages,
      path: "foto.jpg",
      body: new Blob([]),
    });

    expect(storage.publicUrl(BUCKETS.testimonialImages, "foto.jpg")).toBe(url);
  });

  it("mantiene separados los buckets", async () => {
    const storage = new FakeStorage();

    await storage.upload({
      bucket: BUCKETS.logbookImages,
      path: "a.png",
      body: new Blob([]),
    });
    await storage.upload({
      bucket: BUCKETS.testimonialImages,
      path: "a.png",
      body: new Blob([]),
    });

    expect(storage.countIn(BUCKETS.logbookImages)).toBe(1);
    expect(storage.countIn(BUCKETS.testimonialImages)).toBe(1);
  });

  // El adapter real sube con `upsert: false`.
  it("rechaza pisar un objeto que ya existe", async () => {
    const storage = new FakeStorage();
    const input = {
      bucket: BUCKETS.logbookImages,
      path: "a.png",
      body: new Blob([]),
    };

    await storage.upload(input);

    await expect(storage.upload(input)).rejects.toBeInstanceOf(StorageError);
  });

  it("remove borra el objeto", async () => {
    const storage = new FakeStorage();
    await storage.upload({
      bucket: BUCKETS.logbookImages,
      path: "a.png",
      body: new Blob([]),
    });

    await storage.remove(BUCKETS.logbookImages, "a.png");

    expect(storage.countIn(BUCKETS.logbookImages)).toBe(0);
  });

  it("remove no falla si el objeto no existía", async () => {
    const storage = new FakeStorage();

    await expect(
      storage.remove(BUCKETS.logbookImages, "no-existe.png"),
    ).resolves.toBeUndefined();
  });

  it("failNextUpload hace fallar una sola subida", async () => {
    const storage = new FakeStorage();
    storage.failNextUpload = "sin cuota";
    const input = {
      bucket: BUCKETS.logbookImages,
      path: "a.png",
      body: new Blob([]),
    };

    await expect(storage.upload(input)).rejects.toThrow("sin cuota");
    await expect(storage.upload(input)).resolves.toMatchObject({
      path: "a.png",
    });
  });
});
