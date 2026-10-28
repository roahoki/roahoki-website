import { InvitationPile } from "../invitation-pile";

/**
 * La invitación como imagen de 1080 × 1920 para guardar en la galería: la
 * misma composición de la página, en píxeles y con los estilos en línea que
 * entiende Satori (`next/og`).
 */
export const STORY = { width: 1080, height: 1920 } as const;

const PAPER = "#EEECE3";
const INK = "#101610";
const LEAF = "#027816";

export function InvitationImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: PAPER,
        fontFamily: "Bricolage",
        color: INK,
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <InvitationPile width={STORY.width} height={STORY.height} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 80,
          width: 920,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 112,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: -2.2,
          }}
        >
          <span style={{ width: "100%" }}>oficialmente</span>
          te invito a la celebración de los 25 años de&nbsp;
          <span style={{ textDecoration: "line-through" }}>roahoki</span>
          &nbsp;joky!
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 34,
            fontSize: 44,
            lineHeight: 1.25,
          }}
        >
          ojito que mi cumple es el 4 de noviembre pero haré más de una cosita
          esa semana&nbsp;
          <span style={{ color: LEAF }}>:)</span>
        </div>
      </div>
    </div>
  );
}
