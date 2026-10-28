import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PlanDot } from "@/components/birthday/admin/plan-dot";
import { BIRTHDAY_EVENTS, eventBySlug } from "@/lib/birthday/events";
import {
  dotState,
  goingLabel,
  splitByPending,
  summarize,
  visitLabel,
} from "@/lib/birthday/panel";
import { type GuestWithRsvps, listGuests } from "@/lib/birthday/queries";
import { formatTimeAgo } from "@/lib/logbook/format";

/**
 * El inicio del panel del cumpleaños (Figma: panel v1, inicio).
 *
 * Arriba, un contador por plan en su color, que lleva al plan. Abajo, todos los
 * invitados con un puntito por plan, primero a quienes les falta responder
 * algo: es a quien hay que perseguir.
 *
 * `force-dynamic` por lo mismo que las notas: una respuesta recién llegada
 * tiene que verse al recargar.
 */
export const dynamic = "force-dynamic";

export default async function AdminBirthdayPage() {
  const guests = await listGuests();
  const summaries = summarize(guests);
  const { pending, done } = splitByPending(guests);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar title="cumple" />

      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-4 pt-5 pb-28 md:px-0 md:pt-10">
        <ul className="grid grid-cols-2 gap-2.5">
          {summaries.map((summary) => {
            const plan = eventBySlug(summary.slug);
            return (
              <li key={plan.slug}>
                <Link
                  href={`/admin/cumple/events/${plan.path}`}
                  className="flex flex-col gap-0.5 rounded-2xl px-3.5 pt-3 pb-3.5 text-paper"
                  style={{ backgroundColor: plan.color }}
                >
                  <span className="flex items-center justify-between text-card-title-sm">
                    {plan.title}
                    <ArrowRight className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-[2rem] leading-tight font-bold tracking-[-0.015em]">
                    {goingLabel(summary.going)}
                  </span>
                  <span className="text-card-meta">
                    {summary.pending} sin responder · {summary.notGoing} no
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {guests.length === 0 ? (
          <p className="py-12 text-center text-body text-faded">
            Todavía no hay invitados. El primero empieza en "+ invitado".
          </p>
        ) : (
          <>
            <Legend />
            {pending.length > 0 && (
              <GuestSection title="sin responder" guests={pending} />
            )}
            {done.length > 0 && (
              <GuestSection title="ya respondieron" guests={done} />
            )}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper px-4 pt-3 pb-7">
        <Link
          href="/admin/cumple/new"
          className="mx-auto flex h-11 max-w-[680px] items-center justify-center rounded-md border border-ink text-action text-ink"
        >
          + invitado
        </Link>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <p className="flex items-center gap-3.5 text-card-meta text-faded">
      {(
        [
          ["going", "va"],
          ["pending", "sin responder"],
          ["not_going", "no va"],
        ] as const
      ).map(([state, label]) => (
        <span key={state} className="flex items-center">
          <PlanDot state={state} color="var(--ink)" plan={label} />
          {label}
        </span>
      ))}
    </p>
  );
}

function GuestSection({
  title,
  guests,
}: {
  title: string;
  guests: GuestWithRsvps[];
}) {
  return (
    <section aria-labelledby={`grupo-${title}`}>
      <div className="flex items-end justify-between pb-1.5">
        <h2 id={`grupo-${title}`} className="text-entry-meta text-faded">
          {title} ({guests.length})
        </h2>
        {/* Las columnas: un trazo del color de cada plan, en el orden del lineup. */}
        <span className="flex" aria-hidden>
          {BIRTHDAY_EVENTS.map((plan) => (
            <span key={plan.slug} className="flex w-[22px] justify-center">
              <span
                className="h-1 w-3.5 rounded-full"
                style={{ backgroundColor: plan.color }}
              />
            </span>
          ))}
        </span>
      </div>
      <ul>
        {guests.map((guest) => {
          const visit = visitLabel(guest);
          return (
            <li key={guest.id} className="border-t border-rule">
              <Link
                href={`/admin/cumple/guests/${guest.id}`}
                className="flex items-center gap-2 py-3"
              >
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-card-title-sm text-ink">
                    {guest.name}
                  </span>
                  <span
                    className={`text-card-meta ${
                      visit === "no ha abierto el link"
                        ? "text-leaf"
                        : "text-faded"
                    }`}
                  >
                    {visit}
                    {visit === "raspó" && guest.lastSeenAt
                      ? ` · ${formatTimeAgo(guest.lastSeenAt)}`
                      : ""}
                  </span>
                </span>
                <span className="flex">
                  {BIRTHDAY_EVENTS.map((plan) => (
                    <PlanDot
                      key={plan.slug}
                      state={dotState(guest, plan.slug)}
                      color={plan.color}
                      plan={plan.title}
                    />
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
