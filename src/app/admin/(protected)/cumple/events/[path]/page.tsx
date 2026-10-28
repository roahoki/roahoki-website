import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumForm } from "@/components/birthday/admin/album-form";
import { BackBar } from "@/components/birthday/admin/back-bar";
import { CopyButton } from "@/components/birthday/admin/copy-button";
import { EventTextsForm } from "@/components/birthday/admin/event-texts-form";
import { QuestionsPanel } from "@/components/birthday/admin/questions-panel";
import { eventByPath, withTexts } from "@/lib/birthday/events";
import { formatDayTime } from "@/lib/birthday/format";
import { reminderMessage, whatsappLink } from "@/lib/birthday/links";
import { dotState, visitLabel } from "@/lib/birthday/panel";
import {
  albums,
  eventTexts,
  listGuests,
  questionsOf,
} from "@/lib/birthday/queries";

/**
 * Un plan visto desde el panel (Figma: panel v1, por plan): a quién recordarle,
 * quién va y quién no, las dudas por responder, la lista final para copiar,
 * los textos que ven los invitados y el álbum de fotos.
 */
export const dynamic = "force-dynamic";

export default async function AdminBirthdayEventPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const plan = eventByPath(path);
  if (!plan) notFound();

  const [guests, albumUrls, texts, questions] = await Promise.all([
    listGuests(),
    albums(),
    eventTexts(),
    questionsOf(plan.slug),
  ]);
  const unanswered = questions.filter((q) => q.answer === null).length;
  const shown = withTexts(plan, texts[plan.slug]);
  const going = guests.filter((g) => dotState(g, plan.slug) === "going");
  const notGoing = guests.filter((g) => dotState(g, plan.slug) === "not_going");
  const pending = guests.filter((g) => dotState(g, plan.slug) === "pending");

  return (
    <div className="flex min-h-screen flex-col">
      <BackBar href="/admin/cumple" label="cumple" />

      <header
        className="flex flex-col gap-1 px-4 pt-5 pb-6 text-paper md:px-8"
        style={{ backgroundColor: plan.color }}
      >
        <p className="text-entry-meta">{formatDayTime(plan.startsAt)}</p>
        <h1 className="text-[3.5rem] leading-none font-bold tracking-[-0.02em]">
          {plan.title}
        </h1>
        <dl className="mt-2 flex gap-6">
          {(
            [
              [going.length, going.length === 1 ? "va" : "van"],
              [pending.length, "sin responder"],
              [notGoing.length, "no van"],
            ] as const
          ).map(([count, label]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-card-meta">{label}</dt>
              <dd className="text-[2rem] leading-tight font-bold">{count}</dd>
            </div>
          ))}
        </dl>
      </header>

      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-7 px-4 pt-5 pb-16 md:px-0">
        {pending.length > 0 && (
          <section aria-labelledby="sin-responder">
            <h2 id="sin-responder" className="text-entry-meta text-faded">
              sin responder ({pending.length})
            </h2>
            <ul>
              {pending.map((guest) => (
                <li
                  key={guest.id}
                  className="flex items-center justify-between gap-3 border-t border-rule py-2.5 first:border-t-0"
                >
                  <Link
                    href={`/admin/cumple/guests/${guest.id}`}
                    className="flex flex-col"
                  >
                    <span className="text-card-title-sm">{guest.name}</span>
                    <span className="text-card-meta text-faded">
                      {visitLabel(guest)}
                    </span>
                  </Link>
                  <a
                    href={whatsappLink(
                      guest.phone,
                      reminderMessage(guest.name, guest.token, plan),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-3.5 text-action"
                  >
                    <MessageCircle className="size-[18px]" aria-hidden />
                    recordar
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-card-meta text-faded">
              «recordar» abre WhatsApp con un mensaje armado y el link del plan.
            </p>
          </section>
        )}

        <section aria-labelledby="dudas" className="flex flex-col gap-2.5">
          <h2 id="dudas" className="text-entry-meta text-faded">
            dudas{unanswered > 0 ? ` (${unanswered} sin responder)` : ""}
          </h2>
          <QuestionsPanel event={plan.slug} questions={questions} />
        </section>

        <NameChips
          title="van"
          names={going.map((g) => g.name)}
          color={plan.color}
        />
        <NameChips title="no van" names={notGoing.map((g) => g.name)} />

        <section
          aria-labelledby="lista-final"
          className="flex flex-col gap-2.5"
        >
          <h2 id="lista-final" className="text-entry-meta text-faded">
            lista final
          </h2>
          <div>
            <CopyButton
              text={going.map((g) => g.name).join("\n")}
              label="copiar lista"
            />
          </div>
          <p className="text-card-meta text-faded">
            Los nombres de quienes van, uno por línea, para el grupo o la
            reserva.
          </p>
        </section>

        <section aria-labelledby="textos" className="flex flex-col gap-2.5">
          <h2 id="textos" className="text-entry-meta text-faded">
            lo que ven los invitados
          </h2>
          <EventTextsForm
            // Remonta al volver a los originales para que el formulario los
            // muestre.
            key={texts[plan.slug] ? "edited" : "original"}
            event={plan.slug}
            initial={{ question: shown.question, details: shown.details }}
            edited={Boolean(texts[plan.slug])}
          />
        </section>

        <section aria-labelledby="album" className="flex flex-col gap-2.5">
          <h2 id="album" className="text-entry-meta text-faded">
            álbum de fotos
          </h2>
          <AlbumForm
            event={plan.slug}
            initialUrl={albumUrls[plan.slug] ?? null}
          />
        </section>
      </main>
    </div>
  );
}

function NameChips({
  title,
  names,
  color,
}: {
  title: string;
  names: string[];
  color?: string;
}) {
  if (names.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="text-entry-meta text-faded">
        {title} ({names.length})
      </h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {names.map((name) => (
          <li
            key={name}
            className={`rounded-full px-3 py-1.5 text-body ${
              color ? "text-paper" : "border-[1.5px] border-rule text-faded"
            }`}
            style={color ? { backgroundColor: color } : undefined}
          >
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
