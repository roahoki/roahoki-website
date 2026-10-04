import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * El texto sobre `bg-brand` sale de un token, no de `text-white`.
 *
 * Con la paleta del rebranding el acento lleva encima el color del fondo, no
 * blanco. Si algún botón vuelve a `text-white`, el cambio de paleta lo deja
 * ilegible sin que nada falle: por eso se fija acá.
 */

const SRC = join(process.cwd(), "src");
const globalsCss = readFileSync(join(SRC, "app", "globals.css"), "utf8");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

describe("token brand-foreground", () => {
  it("se expone a Tailwind como color", () => {
    expect(globalsCss).toContain(
      "--color-brand-foreground: var(--brand-foreground);",
    );
  });

  it("se define en el tema claro y en el oscuro", () => {
    const definitions = globalsCss.match(/^\s*--brand-foreground:/gm) ?? [];
    expect(definitions).toHaveLength(2);
  });

  it("ningún componente usa text-white sobre bg-brand", () => {
    const offenders = tsxFiles(SRC).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, at: `${file}:${i + 1}` }))
        .filter(
          ({ line }) =>
            /\bbg-brand\b(?![-/])/.test(line) && /\btext-white\b/.test(line),
        )
        .map(({ at }) => at),
    );
    expect(offenders).toEqual([]);
  });
});
