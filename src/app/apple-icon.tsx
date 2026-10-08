import { ImageResponse } from "next/og";
import {
  MARK_PATHS,
  MARK_VIEWBOX,
  viewBoxAttr,
} from "@/components/brand/paths";
import { palette } from "@/lib/brand/palette";

/**
 * Ícono para la pantalla de inicio de iOS, que no acepta SVG.
 *
 * Es el avatar de la marca: la figura en el color del fondo sobre verde
 * botella. Trazo 22 porque en el iPhone se ve a unos 60 px, dentro del rango
 * de 48 a 160 px del brand book.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: palette.bottle,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBoxAttr(MARK_VIEWBOX)}
        width={(112 * MARK_VIEWBOX.width) / MARK_VIEWBOX.height}
        height={112}
        fill="none"
        stroke={palette.paper}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        // Un <title> acá se dibujaría como texto en el PNG: el generador de
        // imágenes no lo trata como metadato.
        aria-hidden="true"
      >
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>,
    size,
  );
}
