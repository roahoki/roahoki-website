import { ImageResponse } from "next/og";
import { InvitationPile } from "@/components/birthday/invitation-pile";
import { ogFonts } from "@/lib/birthday/og-fonts";
import { getGuestByToken } from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";

/**
 * La vista previa del link en WhatsApp (Figma: "cumple · vista previa del
 * link"): la invitación en horizontal, con el nombre de quien la recibe. Así el
 * link llega ya siendo la invitación.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Invitación a los 25 de joky";

const PAPER = "#EEECE3";
const INK = "#101610";
const FADED = "#62695C";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = isToken(token) ? await getGuestByToken(token) : undefined;

  return new ImageResponse(
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
      {/* La pila de la invitación, a la derecha y cortada por abajo. */}
      <div
        style={{ position: "absolute", right: -20, bottom: 0, display: "flex" }}
      >
        <InvitationPile viewBox="0 834 1080 1086" width={608} height={612} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "56px 0 0 64px",
          width: 640,
          height: "100%",
        }}
      >
        {guest && (
          <div style={{ fontSize: 36, color: FADED, marginBottom: 16 }}>
            {`para ${guest.name} :)`}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: -1.3,
          }}
        >
          te invito a la celebración de los 25 años de&nbsp;
          <span style={{ textDecoration: "line-through" }}>roahoki</span>
          &nbsp;joky!
        </div>
        <div
          style={{
            marginTop: "auto",
            marginBottom: 56,
            fontSize: 28,
            width: 520,
          }}
        >
          4 de noviembre y más de una cosita esa semana
        </div>
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
