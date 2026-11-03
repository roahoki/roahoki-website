import {
  MARK_PATHS,
  MARK_VIEWBOX,
  viewBoxAttr,
} from "@/components/brand/paths";

/**
 * El roki del logo para las imágenes de `next/og`: SVG plano, con el grosor y
 * el color en línea, que es lo que entiende Satori.
 */
export function Mark({
  size,
  color,
  stroke,
}: {
  size: number;
  color: string;
  stroke: number;
}) {
  return (
    <svg
      viewBox={viewBoxAttr(MARK_VIEWBOX)}
      width={(size * MARK_VIEWBOX.width) / MARK_VIEWBOX.height}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
