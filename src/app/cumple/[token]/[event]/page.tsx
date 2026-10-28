import { notFound, redirect } from "next/navigation";
import { eventByPath } from "@/lib/birthday/events";
import { getGuestByToken } from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";

/**
 * La URL vieja de cada plan (`/cumple/<token>/<plan>`). Los planes ahora viven
 * todos en la página del invitado; esta ruta queda para los links que ya se
 * compartieron y lleva al ancla del plan.
 *
 * Un plan al que el invitado no está invitado sigue sin existir: 404, igual
 * que un token que no es de nadie.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string; event: string }> };

export default async function BirthdayEventRedirect({ params }: Params) {
  const { token, event } = await params;
  const plan = eventByPath(event);
  const guest =
    plan && isToken(token) ? await getGuestByToken(token) : undefined;
  if (!plan || !guest?.invitedEvents.includes(plan.slug)) notFound();
  redirect(`/cumple/${token}#${plan.path}`);
}
