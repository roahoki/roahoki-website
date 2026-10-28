import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { STORY } from "@/components/birthday/og/invitation-image";
import { ScheduleImage } from "@/components/birthday/og/schedule-image";
import { eventsFor } from "@/lib/birthday/events";
import { ogFonts } from "@/lib/birthday/og-fonts";
import { getGuestByToken, rsvpsOf } from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";

type Params = { params: Promise<{ token: string }> };

/**
 * El cronograma de un invitado, 1080 × 1920. Personal: cambia cada vez que
 * responde un plan, así que no se guarda en ningún caché compartido.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const guest = isToken(token) ? await getGuestByToken(token) : undefined;
  if (!guest) return new Response("Ese link no existe.", { status: 404 });

  const rsvps = await rsvpsOf(guest.id);
  const plans = eventsFor(guest.invitedEvents).map((plan) => ({
    plan,
    status: rsvps[plan.slug],
  }));

  const image = new ImageResponse(
    <ScheduleImage name={guest.name} plans={plans} />,
    {
      ...STORY,
      fonts: await ogFonts(),
    },
  );
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
