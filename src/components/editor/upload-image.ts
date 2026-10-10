/**
 * Sube una imagen al endpoint del editor y devuelve su URL pública.
 *
 * Con `XMLHttpRequest` y no `fetch`: `fetch` no informa el avance de una
 * subida, y en el celular una foto de 3 MB tarda lo suficiente como para que
 * "subiendo… 60 %" importe.
 */
export function uploadImage(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/logbook/images");
    xhr.responseType = "json";

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress((event.loaded / event.total) * 100);
    });

    xhr.addEventListener("load", () => {
      const data = xhr.response as { url?: string; error?: string } | null;
      if (xhr.status === 401) {
        reject(new Error("la sesión expiró; vuelve a entrar."));
      } else if (xhr.status >= 200 && xhr.status < 300 && data?.url) {
        resolve(data.url);
      } else {
        reject(new Error(data?.error ?? "no se pudo subir."));
      }
    });
    xhr.addEventListener("error", () =>
      reject(new Error("no se pudo subir; revisa la conexión.")),
    );

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
