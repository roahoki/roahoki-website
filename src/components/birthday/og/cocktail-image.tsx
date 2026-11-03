import { eventBySlug } from "@/lib/birthday/events";
import { formatLongDay, formatTime } from "@/lib/birthday/format";
import { Mark } from "./mark";

/**
 * La invitación al cóctel para el grupo de WhatsApp de la familia, 1080 × 1350.
 *
 * 4:5 y no 9:16 como la invitación de la página: WhatsApp muestra entera una
 * foto 4:5 en la burbuja del chat, y una 9:16 la recorta hasta que se toca. La
 * familia no tiene link personal; esta foto es toda la invitación, así que la
 * letra va grande y la fecha sin abreviar.
 *
 * Fecha, hora y color salen del catálogo de planes: si se mueve el cóctel, la
 * foto se mueve con él.
 */
export const PORTRAIT = { width: 1080, height: 1350 } as const;

const PAPER = "#EEECE3";
const MARK = 420;

export function CocktailImage() {
  const plan = eventBySlug("cocktail");
  const rows = [
    ["¿cuándo?", `${formatTime(plan.startsAt)} a ${formatTime(plan.endsAt)}`],
    ["¿dónde?", plan.place],
    ["vestimenta", "formal"],
  ] as const;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        backgroundColor: plan.color,
        color: PAPER,
        fontFamily: "Bricolage",
        padding: "96px 88px",
      }}
    >
      <div
        style={{
          display: "flex",
          // Asoma desde abajo con los remates del cuello, como en el
          // cronograma (brand book §5.2).
          position: "absolute",
          right: 56,
          top: PORTRAIT.height - MARK * 0.74,
          transform: "rotate(12deg)",
        }}
      >
        <Mark size={MARK} color={PAPER} stroke={14} />
      </div>

      <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
        {formatLongDay(plan.startsAt)}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 36,
          fontSize: 100,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -2,
        }}
      >
        están invitados a la celebración del cumpleaños y la titulación del
        joky!
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 48,
          fontSize: 64,
          lineHeight: 1.1,
        }}
      >
        será un cóctel :)
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
          marginTop: "auto",
        }}
      >
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 36, opacity: 0.75 }}>
              {label}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
