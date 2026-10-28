import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Invitation } from "@/components/birthday/invitation";
import { PlanCard } from "@/components/birthday/plan-card";
import { SaveImages } from "@/components/birthday/save-images";
import { ScratchGate } from "@/components/birthday/scratch-gate";
import { VisitBeacon } from "@/components/birthday/visit-beacon";
import { eventsFor } from "@/lib/birthday/events";
import { getGuestByToken, rsvpsOf } from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";
import { WHATSAPP_URL } from "@/lib/profile";

/**
 * La página de cada invitado: `/cumple/<token>` (Figma: invitado v3, home).
 *
 * Render dinámico y no ISR: es personal, cambia con cada respuesta y no hay
 * nada que cachear entre invitados.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

async function guestFor(token: string) {
  return isToken(token) ? getGuestByToken(token) : undefined;
}

/**
 * El título y la descripción son lo que WhatsApp muestra debajo de la imagen
 * de la vista previa (`opengraph-image.tsx`).
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const guest = await guestFor((await params).token);
  if (!guest) return { title: "este link no existe" };
  const title = `${guest.name}, te invito a mis 25 :)`;
  const description = "Abre tu link para ver los planes y confirmar.";
  return { title, description, openGraph: { title, description } };
}

export default async function BirthdayGuestPage({ params }: Params) {
  const { token } = await params;
  const guest = await guestFor(token);
  if (!guest) notFound();

  const rsvps = await rsvpsOf(guest.id);
  const plans = eventsFor(guest.invitedEvents);
  const pending = plans.filter((plan) => !rsvps[plan.slug]).length;

  return (
    <>
      <VisitBeacon token={token} />
      <main className="mx-auto flex max-w-[480px] flex-col gap-10 px-4 pt-4 pb-12">
        <ScratchGate
          token={token}
          scratched={Boolean(guest.scratchedAt)}
          card={<Invitation />}
        >
          <section className="flex flex-col gap-3">
            <h1 className="text-card-title">hola, {guest.name} :)</h1>
            {guest.personalMessage && (
              <p className="text-entry-body whitespace-pre-line">
                {guest.personalMessage}
              </p>
            )}
          </section>

          <section aria-labelledby="tus-planes" className="flex flex-col gap-3">
            <h2 id="tus-planes" className="sr-only">
              tus planes
            </h2>
            <p className="rounded-lg border-[1.5px] border-leaf px-3.5 py-3 text-entry-meta text-leaf">
              {pending === 0
                ? "ya respondiste todo, gracias :)"
                : pending === 1
                  ? "te falta 1 por confirmar"
                  : `te faltan ${pending} por confirmar`}
            </p>
            {plans.map((plan) => (
              <PlanCard
                key={plan.slug}
                token={token}
                plan={plan}
                status={rsvps[plan.slug]}
              />
            ))}
          </section>

          <SaveImages token={token} />

          <footer>
            <a
              href={WHATSAPP_URL}
              className="inline-flex items-center gap-2 text-body text-leaf"
            >
              <MessageCircle className="size-5" aria-hidden />
              ¿dudas? escríbeme
            </a>
          </footer>
        </ScratchGate>
      </main>
    </>
  );
}
