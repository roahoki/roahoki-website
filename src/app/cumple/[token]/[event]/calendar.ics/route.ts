import { type NextRequest, NextResponse } from "next/server";
import { eventByPath } from "@/lib/birthday/events";
import { eventIcs } from "@/lib/birthday/ics";
import { guestEventUrl } from "@/lib/birthday/links";
import { getGuestByToken } from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";

type Params = { params: Promise<{ token: string; event: string }> };

/** El plan para agregar al calendario, solo si el invitado está invitado. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token, event } = await params;
  const plan = eventByPath(event);
  const guest =
    plan && isToken(token) ? await getGuestByToken(token) : undefined;
  if (!plan || !guest?.invitedEvents.includes(plan.slug)) {
    return new NextResponse("Ese plan no existe.", { status: 404 });
  }

  return new NextResponse(
    eventIcs({
      event: plan,
      guestId: guest.id,
      url: guestEventUrl(token, plan),
    }),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${plan.path}.ics"`,
        // Es personal: que ningún caché intermedio lo guarde.
        "Cache-Control": "private, no-store",
      },
    },
  );
}
