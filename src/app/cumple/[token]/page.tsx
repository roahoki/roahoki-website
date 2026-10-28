import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Invitation } from "@/components/birthday/invitation";
import { PlanSection } from "@/components/birthday/plan-section";
import { RokiReminder } from "@/components/birthday/roki-reminder";
import { SaveImages } from "@/components/birthday/save-images";
import {
  ScratchAgainButton,
  ScratchGate,
} from "@/components/birthday/scratch-gate";
import { ScrollBackdrop } from "@/components/birthday/scroll-backdrop";
import { VisitBeacon } from "@/components/birthday/visit-beacon";
import { WeekStrip } from "@/components/birthday/week-strip";
import { eventsFor, hasPassed, withTexts } from "@/lib/birthday/events";
import {
  albums,
  attendeesOf,
  eventTexts,
  getGuestByToken,
  questionsForGuest,
  rsvpsOf,
} from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";
import { birthdayWeek } from "@/lib/birthday/week";
import { WHATSAPP_URL } from "@/lib/profile";

/**
 * La página de cada invitado: `/cumple/<token>` (Figma: invitado v3, home).
 *
 * Una sola página larga: la invitación, el saludo y después cada plan entero,
 * uno tras otro, con la pantalla del color del plan que se ve (bloque 3 del
 * roadmap). Pasar de un plan a otro es bajar.
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

  const invited = eventsFor(guest.invitedEvents);
  const [rsvps, albumUrls, texts, questions, ...attendees] = await Promise.all([
    rsvpsOf(guest.id),
    albums(),
    eventTexts(),
    questionsForGuest(
      guest.id,
      invited.map((plan) => plan.slug),
    ),
    ...invited.map((plan) => attendeesOf(plan.slug)),
  ]);
  // Los textos corregidos desde el panel reemplazan a los de código.
  const plans = invited.map((plan) => withTexts(plan, texts[plan.slug]));
  const week = birthdayWeek(plans).map((day) => ({
    letter: day.letter,
    date: day.date,
    plans: day.plans.map(({ path, title, color }) => ({ path, title, color })),
  }));
  // Sin responder y que todavía se pueden responder: los que ya pasaron no.
  const pending = plans
    .filter((plan) => !rsvps[plan.slug] && !hasPassed(plan))
    .map(({ path, title }) => ({ path, title }));

  return (
    <>
      <VisitBeacon token={token} />
      <main className="mx-auto flex max-w-[480px] flex-col gap-10 px-4 pt-4">
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

          <ScrollBackdrop />
          <RokiReminder pending={pending} />
          {/* Pegada arriba hasta el final de la página: es el índice. */}
          <WeekStrip days={week} />

          <section aria-labelledby="tus-planes" className="flex flex-col">
            <h2 id="tus-planes" className="sr-only">
              tus planes
            </h2>
            {/* Sin espacio entre planes: el color pasa de uno al otro sin
                que asome el papel en medio. */}
            {plans.map((plan, index) => (
              <PlanSection
                key={plan.slug}
                token={token}
                plan={plan}
                status={rsvps[plan.slug] ?? null}
                attendees={attendees[index]}
                album={albumUrls[plan.slug]}
                questions={questions[plan.slug] ?? []}
                me={{ id: guest.id, roki: guest.roki }}
              />
            ))}
          </section>

          {/* Una hoja papel propia, de borde a borde y hasta el final: el fondo
              de la pantalla sigue del color del último plan, y el texto de
              acá se lee igual. */}
          <div
            data-page-end
            className="relative isolate -mt-10 flex flex-col gap-10 pt-10 pb-12 text-ink before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:rounded-t-[28px] before:bg-paper"
          >
            <SaveImages token={token} />

            <footer className="flex flex-col gap-6">
              <a
                href={WHATSAPP_URL}
                className="inline-flex items-center gap-2 text-body text-leaf"
              >
                <MessageCircle className="size-5" aria-hidden />
                ¿dudas? escríbeme
              </a>
              <ScratchAgainButton />
            </footer>
          </div>
        </ScratchGate>
      </main>
    </>
  );
}
