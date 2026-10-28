import {
  MARK_PATHS,
  MARK_VIEWBOX,
  viewBoxAttr,
} from "@/components/brand/paths";
import type { RsvpStatus } from "@/db/schema";
import type { BirthdayEvent } from "@/lib/birthday/events";
import { formatDay, formatTime } from "@/lib/birthday/format";
import type { Roki } from "@/lib/birthday/roki";

/**
 * El cronograma como imagen de 1080 × 1920 (Figma: "cumple v3 · cronograma
 * 9:16"): una banda por plan del invitado, en su color y en orden. En los que
 * dijo voy asoma su roki, el que dibujó, desde el borde de abajo; si no dibujó,
 * el del logo.
 *
 * Trae todos sus planes y no solo los confirmados: es el programa de su
 * semana, y roki marca a cuáles ya dijo que sí.
 */

const PAPER = "#EEECE3";
const INK = "#101610";

function Mark({
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

/**
 * El roki que dibujó el invitado, todo en papel: sus colores (tinta, botella,
 * azul…) no se leerían sobre el color de la banda, y en papel queda de la
 * misma familia que el roki del logo al que reemplaza. Sin el ojo animado: es
 * una imagen.
 *
 * Trazos como `path` y no `polyline`, que es lo que mejor entiende `next/og`.
 */
function DrawnRoki({ roki, size }: { roki: Roki; size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      stroke={PAPER}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {roki.strokes.map((stroke, index) => (
        <path
          // Los trazos no se reordenan: el índice es la identidad.
          // biome-ignore lint/suspicious/noArrayIndexKey: lista fija
          key={index}
          d={stroke.points
            .map(
              ([x, y], i) =>
                `${i === 0 ? "M" : "L"}${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`,
            )
            .join(" ")}
        />
      ))}
    </svg>
  );
}

export function ScheduleImage({
  name,
  roki,
  plans,
}: {
  name: string;
  /** El roki que dibujó, o `null` si todavía no. */
  roki: Roki | null;
  plans: { plan: BirthdayEvent; status: RsvpStatus | undefined }[];
}) {
  // Las bandas reparten el alto disponible, hasta 440 px cada una.
  const available = 1920 - 230 - 230 - 28 * (plans.length - 1);
  const band = Math.min(440, Math.floor(available / Math.max(1, plans.length)));
  // Con bandas más bajas, título y roki más chicos, para que no choquen.
  const title = band >= 380 ? 180 : band >= 300 ? 128 : 108;
  const mark = band >= 380 ? 300 : 230;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: PAPER,
        fontFamily: "Bricolage",
        color: INK,
        padding: "96px 48px 72px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 700,
          marginLeft: 24,
          marginBottom: 56,
        }}
      >
        {`${name}, te espero en`}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {plans.map(({ plan, status }) => (
          <div
            key={plan.slug}
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
              height: band,
              borderRadius: 40,
              backgroundColor: plan.color,
              color: PAPER,
              padding: "40px 48px",
            }}
          >
            {status === "going" && (
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  right: 28,
                  // Asoma la cabeza y los remates del cuello (brand book §5.2).
                  top: band - mark * 0.68,
                  transform: "rotate(12deg)",
                }}
              >
                {roki ? (
                  <DrawnRoki roki={roki} size={mark} />
                ) : (
                  <Mark size={mark} color={PAPER} stroke={14} />
                )}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>
              {formatDay(plan.startsAt)}
            </div>
            <div
              style={{
                display: "flex",
                // "manquehue" es el título largo: a tamaño completo llega
                // hasta donde asoma roki.
                fontSize: plan.title.length > 7 ? Math.min(title, 136) : title,
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: -5,
                marginTop: 12,
              }}
            >
              {plan.title}
            </div>
            <div style={{ display: "flex", fontSize: 40, marginTop: "auto" }}>
              {`${formatTime(plan.startsAt)} · ${plan.place}`}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: "auto",
          padding: "0 24px",
        }}
      >
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
          los 25 de&nbsp;
          <span style={{ textDecoration: "line-through" }}>roahoki</span>
          &nbsp;joky :)
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <Mark size={62} color={INK} stroke={22} />
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            roahoki
          </div>
        </div>
      </div>
    </div>
  );
}
