import { ArrowLeft, CalendarPlus, Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColorFlood } from "@/components/birthday/color-flood";
import { RokiFigure } from "@/components/birthday/roki-figure";
import { RsvpButtons } from "@/components/birthday/rsvp-buttons";
import { VisitBeacon } from "@/components/birthday/visit-beacon";
import { eventByPath, hasPassed } from "@/lib/birthday/events";
import { formatDayTime, formatTime } from "@/lib/birthday/format";
import {
  albums,
  attendeesOf,
  getGuestByToken,
  rsvpsOf,
} from "@/lib/birthday/queries";
import { isToken } from "@/lib/birthday/token";

/**
 * La página de un plan: `/cumple/<token>/<plan>` (Figma: invitado v3, trote).
 * Toda en el color del plan, con los datos, el voy / no voy y quiénes van.
 *
 * Un plan al que el invitado no está invitado no existe: 404, igual que un
 * token que no es de nadie.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string; event: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const plan = eventByPath((await params).event);
  return {
    title: plan ? `${plan.title} · los 25 de joky` : "este link no existe",
  };
}

export default async function BirthdayEventPage({ params }: Params) {
  const { token, event } = await params;
  const plan = eventByPath(event);
  const guest =
    plan && isToken(token) ? await getGuestByToken(token) : undefined;
  if (!plan || !guest?.invitedEvents.includes(plan.slug)) notFound();

  const [rsvps, attendees, albumUrls] = await Promise.all([
    rsvpsOf(guest.id),
    attendeesOf(plan.slug),
    albums(),
  ]);
  const status = rsvps[plan.slug] ?? null;
  const passed = hasPassed(plan);
  const album = albumUrls[plan.slug];

  return (
    <ColorFlood color={plan.color}>
      <VisitBeacon token={token} />
      <header className="mx-auto max-w-[480px] px-4 pt-5">
        <Link
          href={`/cumple/${token}`}
          className="inline-flex items-center gap-1.5 text-action"
        >
          <ArrowLeft className="size-5" aria-hidden />
          volver
        </Link>
      </header>

      <main className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 pt-7 pb-14">
        <div>
          <p className="text-entry-meta">
            {formatDayTime(plan.startsAt)} a {formatTime(plan.endsAt)}
          </p>
          <h1 className="text-[4rem] leading-none font-bold tracking-[-0.02em]">
            {plan.title}
          </h1>
        </div>

        <dl className="flex flex-col gap-4">
          {plan.details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-entry-meta font-bold">{detail.label}</dt>
              <dd className="text-entry-body">{detail.value}</dd>
            </div>
          ))}
        </dl>

        {passed ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-card-title">
              ya pasó{status === "going" ? " · fuiste :)" : ""}
            </h2>
            {album ? (
              <a
                href={album}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-paper px-4 text-action"
                style={{ color: plan.color }}
              >
                <Images className="size-[18px]" aria-hidden />
                ver las fotos
              </a>
            ) : (
              <p className="text-entry-body">
                pronto les compartiré las fotos :)
              </p>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="text-card-title">{plan.question}</h2>
            <RsvpButtons
              token={token}
              event={plan.slug}
              color={plan.color}
              initial={status}
            />
          </section>
        )}

        <section
          aria-labelledby="quienes-van"
          className="rounded-2xl bg-paper px-4 pt-3.5 pb-5 text-ink"
        >
          <h2 id="quienes-van" className="text-card-title-sm">
            quiénes van
          </h2>
          <p className="text-entry-meta text-faded">
            {attendees.length === 0
              ? "todavía nadie, ¿partes tú?"
              : attendees.length === 1
                ? "va 1"
                : `van ${attendees.length}`}
          </p>
          {attendees.length > 0 && (
            <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4">
              {attendees.map((attendee) => {
                const me = attendee.id === guest.id;
                return (
                  <li
                    key={attendee.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <RokiFigure
                      roki={attendee.roki}
                      color={plan.color}
                      size={64}
                      label={me ? "tu roki" : `el roki de ${attendee.name}`}
                    />
                    <span className="max-w-full truncate text-card-meta">
                      {me ? "tú" : attendee.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {!passed && (
          <a
            href={`/cumple/${token}/${plan.path}/calendar.ics`}
            className="inline-flex h-11 items-center gap-2 self-start rounded-full border-[1.5px] border-paper px-4 text-action"
          >
            <CalendarPlus className="size-[18px]" aria-hidden />
            agregar al calendario
          </a>
        )}
      </main>
    </ColorFlood>
  );
}
