import { Images } from "lucide-react";
import type { RsvpStatus } from "@/db/schema";
import { type BirthdayEvent, hasPassed } from "@/lib/birthday/events";
import { formatDayTime, formatTime } from "@/lib/birthday/format";
import type { Attendee, GuestQuestion } from "@/lib/birthday/queries";
import type { Roki } from "@/lib/birthday/roki";
import { PlanQuestions } from "./plan-questions";
import { PlanResponse } from "./plan-response";

/**
 * Un plan dentro de la página del invitado: datos, voy o no voy, quiénes van
 * las dudas y, si ya pasó, el álbum. Antes era una página aparte (`/cumple/<token>/<plan>`)
 * y costaba volver para ir a otro; ahora los planes van uno tras otro y se pasa
 * de uno al siguiente bajando.
 *
 * `data-backdrop` le avisa a `ScrollBackdrop` de qué color pintar la pantalla
 * mientras el plan está a la vista. El `id` es el ancla a la que redirige la
 * URL vieja de cada plan.
 */
export function PlanSection({
  token,
  plan,
  status,
  attendees,
  album,
  questions,
  me,
}: {
  token: string;
  plan: BirthdayEvent;
  status: RsvpStatus | null;
  attendees: Attendee[];
  album: string | undefined;
  questions: GuestQuestion[];
  me: { id: string; roki: Roki | null };
}) {
  const passed = hasPassed(plan);
  const titleId = `plan-${plan.path}`;

  return (
    <section
      id={plan.path}
      aria-labelledby={titleId}
      data-backdrop={plan.color}
      // `scroll-mt-12`: al saltar al plan, el título queda bajo la semana.
      className="flex scroll-mt-12 flex-col gap-8 py-14 text-paper"
    >
      <div>
        <p className="text-entry-meta">
          {formatDayTime(plan.startsAt)} a {formatTime(plan.endsAt)}
        </p>
        <h2
          id={titleId}
          className="text-[4rem] leading-none font-bold tracking-[-0.02em]"
        >
          {plan.title}
        </h2>
      </div>

      <dl className="flex flex-col gap-5">
        {plan.details.map((detail, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: lista fija por render; dos datos pueden repetir subtítulo desde el panel.
            key={index}
            className="flex flex-col gap-1"
          >
            <dt className="text-card-title-sm">{detail.label}</dt>
            <dd className="text-entry-body">{detail.value}</dd>
          </div>
        ))}
      </dl>

      {passed && (
        <div className="flex flex-col gap-3">
          <h3 className="text-card-title">
            ya pasó{status === "going" ? " · fuiste :)" : ""}
          </h3>
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
        </div>
      )}

      <PlanResponse
        token={token}
        plan={{
          slug: plan.slug,
          title: plan.title,
          color: plan.color,
          question: plan.question,
        }}
        status={status}
        passed={passed}
        attendees={attendees}
        me={me}
      />

      <PlanQuestions
        token={token}
        event={plan.slug}
        color={plan.color}
        passed={passed}
        initial={questions}
      />
    </section>
  );
}
