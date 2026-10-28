import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Bricolage en TTF para las imágenes de `next/og`.
 *
 * Satori, que dibuja esas imágenes, no lee woff2 ni fuentes variables: necesita
 * instancias estáticas. Son dos, de Google Fonts: Regular con tamaño óptico 14
 * y Bold con tamaño óptico 96, que es como se ven en la página los textos
 * chicos y los títulos grandes.
 */
const FONTS_DIR = join(process.cwd(), "src/assets/fonts");

export async function ogFonts() {
  const [regular, bold] = await Promise.all([
    readFile(join(FONTS_DIR, "BricolageGrotesque-Regular.ttf")),
    readFile(join(FONTS_DIR, "BricolageGrotesque-Bold.ttf")),
  ]);
  return [
    {
      name: "Bricolage",
      data: regular,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Bricolage",
      data: bold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}
