import type { SVGProps } from "react";
import { MARK_PATHS, MARK_VIEWBOX, viewBoxAttr } from "./paths";

/**
 * Grosor de trazo según el tamaño al que se muestra la figura (brand book
 * §5.2): cuanto más chica, más gruesa, igual que Bricolage cambia de forma con
 * su tamaño óptico. No hay versión más gruesa que 32: si a un tamaño no se
 * lee, se usa más grande o no se usa.
 */
export function markStrokeForSize(size: number): 14 | 22 | 32 {
  if (size <= 48) return 32;
  if (size <= 160) return 22;
  return 14;
}

type LogoMarkProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Alto en px. El ancho sale de la proporción de la figura. */
  size: number;
  /** Si se pasa, la figura se anuncia; si no, es decorativa. */
  title?: string;
};

/**
 * La figura de roahoki, sin el nombre. Toma el color del texto que la rodea
 * (`currentColor`).
 */
export function LogoMark({ size, title, ...props }: LogoMarkProps) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: viewBoxAttr(MARK_VIEWBOX),
    width: (size * MARK_VIEWBOX.width) / MARK_VIEWBOX.height,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: markStrokeForSize(size),
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  } as const;
  const paths = MARK_PATHS.map((d) => <path key={d} d={d} />);

  // Dos ramas explícitas para que la accesibilidad sea legible (y verificable
  // por el linter): con título se anuncia, sin título es decorativa.
  if (title) {
    return (
      <svg {...common} role="img" aria-label={title}>
        <title>{title}</title>
        {paths}
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      {paths}
    </svg>
  );
}
