import type { ReactNode, SVGProps } from "react";
import {
  MARK_PATHS,
  MARK_VIEWBOX,
  viewBoxAttr,
} from "@/components/brand/paths";
import type { Roki } from "@/lib/birthday/roki";

/**
 * El roki de un invitado: su dibujo si lo hizo, o el roki genérico en el color
 * del plan si todavía no.
 *
 * Los trazos se guardan normalizados de 0 a 1 (ver `roki.ts`), así que se
 * dibujan en un `viewBox` de 0 a 100 y escalan a cualquier tamaño. Solo
 * líneas, nunca relleno: es como se ve roki (brand book §5.2).
 */
export function RokiFigure({
  roki,
  color,
  size,
  label,
}: {
  roki: Roki | null;
  color: string;
  size: number;
  label?: string;
}) {
  if (!roki) {
    return (
      <Figure
        label={label}
        viewBox={viewBoxAttr(MARK_VIEWBOX)}
        width={(size * MARK_VIEWBOX.width) / MARK_VIEWBOX.height}
        height={size}
        stroke={color}
        strokeWidth={size > 48 ? 22 : 32}
      >
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </Figure>
    );
  }

  return (
    <Figure
      label={label}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      strokeWidth={size > 48 ? 3.4 : 5}
    >
      {roki.strokes.map((stroke, index) => (
        <polyline
          // Los trazos no se reordenan: el índice es la identidad.
          // biome-ignore lint/suspicious/noArrayIndexKey: lista fija
          key={index}
          data-eye={index === roki.eye ? "" : undefined}
          // El ojo parpadea (ver `.roki-eye` en globals.css), cada roki a su
          // ritmo para que la pila no pestañee al unísono.
          className={index === roki.eye ? "roki-eye" : undefined}
          style={
            index === roki.eye
              ? { animationDelay: `${blinkDelay(roki)}s` }
              : undefined
          }
          stroke={stroke.color}
          points={stroke.points
            .map(([x, y]) => `${x * 100},${y * 100}`)
            .join(" ")}
        />
      ))}
    </Figure>
  );
}

/**
 * Un desfase estable para el parpadeo, sacado del propio dibujo: el mismo roki
 * parpadea siempre igual y dos rokis distintos casi nunca a la vez.
 */
function blinkDelay(roki: Roki): number {
  const seed = roki.strokes
    .flatMap((stroke) => stroke.points.slice(0, 3).flat())
    .reduce((sum, value) => sum + value * 1000, 0);
  return -(Math.round(seed) % 50) / 10;
}

/**
 * El `<svg>` con su accesibilidad. Dos ramas explícitas, como en `LogoMark`:
 * con nombre se anuncia, sin nombre es decorativa.
 */
function Figure({
  label,
  children,
  ...props
}: SVGProps<SVGSVGElement> & { label?: string; children: ReactNode }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  } as const;

  if (label) {
    return (
      <svg {...common} role="img" aria-label={label}>
        <title>{label}</title>
        {children}
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      {children}
    </svg>
  );
}
