import type { SVGProps } from "react";
import { LOGO_PATHS, LOGO_STROKE, LOGO_VIEWBOX, viewBoxAttr } from "./paths";

type LogoProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Alto en px. El ancho sale de la proporción del logo. */
  height?: number;
};

/**
 * El logo de roahoki: la figura al lado del nombre dibujado en el mismo trazo
 * (brand book §5.2). Toma el color del texto que lo rodea (`currentColor`).
 *
 * Siempre se anuncia como "roahoki": cuando va solo, como en el header, es el
 * nombre del sitio y no un adorno.
 */
export function Logo({ height = 24, ...props }: LogoProps) {
  const width = (height * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBoxAttr(LOGO_VIEWBOX)}
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={LOGO_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="roahoki"
      {...props}
    >
      <title>roahoki</title>
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
