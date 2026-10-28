import { MessageCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackBar } from "@/components/birthday/admin/back-bar";
import { ConfirmButton } from "@/components/birthday/admin/confirm-button";
import { CopyButton } from "@/components/birthday/admin/copy-button";
import { GuestPlans } from "@/components/birthday/admin/guest-plans";
import { LogoMark } from "@/components/brand/logo-mark";
import type { BirthdayGuest } from "@/db/schema";
import { formatDay } from "@/lib/birthday/format";
import { idSchema } from "@/lib/birthday/http";
import { guestUrl, inviteMessage, whatsappLink } from "@/lib/birthday/links";
import { visitLabel } from "@/lib/birthday/panel";
import { getGuestById, rsvpsOf } from "@/lib/birthday/queries";
import { formatTimeAgo } from "@/lib/logbook/format";

/**
 * La ficha de un invitado (Figma: panel v1, ficha), y también la pantalla de
 * "link listo" que se ve justo después de crearlo (`?nuevo=1`): ahí lo único
 * que importa es mandarle el link, así que eso va primero y grande.
 */
export const dynamic = "force-dynamic";

export default async function BirthdayGuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [guest, rsvps, { nuevo }] = await Promise.all([
    getGuestById(id),
    rsvpsOf(id),
    searchParams,
  ]);
  if (!guest) notFound();

  const url = guestUrl(guest.token);
  const message = inviteMessage(guest.name, guest.token);
  const whatsapp = whatsappLink(guest.phone, message);

  return (
    <div className="flex min-h-screen flex-col">
      <BackBar href="/admin/cumple" label="cumple" />

      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-7 px-4 pt-5 pb-16 md:px-0 md:pt-10">
        {nuevo ? (
          <NewGuestCard
            name={guest.name}
            message={message}
            whatsapp={whatsapp}
            preview={`/cumple/${guest.token}/opengraph-image`}
          />
        ) : (
          <Header guest={guest} />
        )}

        <section aria-labelledby="su-link" className="flex flex-col gap-2.5">
          <h2 id="su-link" className="text-entry-meta text-faded">
            su link
          </h2>
          <p className="truncate rounded-lg border-[1.5px] border-rule px-3.5 py-3 text-body">
            {url.replace("https://www.", "")}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-action text-paper"
            >
              <MessageCircle className="size-[18px]" aria-hidden />
              WhatsApp
            </a>
            <CopyButton text={url} label="copiar" />
          </div>
        </section>

        <section aria-labelledby="mensaje" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 id="mensaje" className="text-entry-meta text-faded">
              mensaje personal
            </h2>
            <Link
              href={`/admin/cumple/guests/${guest.id}/edit`}
              className="inline-flex items-center gap-1 text-entry-meta text-leaf"
            >
              <Pencil className="size-3.5" aria-hidden />
              editar
            </Link>
          </div>
          <p className="text-body whitespace-pre-line text-ink">
            {guest.personalMessage ?? (
              <span className="text-faded">
                Sin mensaje: solo verá el saludo.
              </span>
            )}
          </p>
        </section>

        <GuestPlans
          guest={{
            id: guest.id,
            name: guest.name,
            phone: guest.phone,
            personalMessage: guest.personalMessage,
            invitedEvents: guest.invitedEvents,
          }}
          initialRsvps={rsvps}
        />

        <section aria-labelledby="soporte">
          <h2 id="soporte" className="text-entry-meta text-faded">
            soporte
          </h2>
          <ul>
            {guest.roki && (
              <SupportItem>
                <ConfirmButton
                  title={`¿borrar el roki de ${guest.name}?`}
                  description="Vuelve al roki genérico. La próxima vez que diga voy, se le pide dibujar de nuevo."
                  confirmLabel="borrar su roki"
                  url={`/api/admin/birthday/guests/${guest.id}/roki`}
                  method="DELETE"
                  icon="eraser"
                  label="borrar su roki"
                  detail="vuelve al roki genérico y le pedirá dibujar de nuevo"
                />
              </SupportItem>
            )}
            <SupportItem>
              <ConfirmButton
                title={`¿regenerar el link de ${guest.name}?`}
                description="Su link actual deja de funcionar al tiro: quien lo abra verá «este link no existe». Sus respuestas y su roki se mantienen. Después tienes que mandarle el nuevo."
                confirmLabel="regenerar"
                url={`/api/admin/birthday/guests/${guest.id}/token`}
                method="POST"
                icon="refresh"
                label="regenerar su link"
                detail="el link actual deja de funcionar al tiro"
              />
            </SupportItem>
            <SupportItem>
              <ConfirmButton
                title={`¿eliminar a ${guest.name}?`}
                description="Se borran sus respuestas y su roki, y su link deja de funcionar. No se puede deshacer."
                confirmLabel="eliminar"
                url={`/api/admin/birthday/guests/${guest.id}`}
                method="DELETE"
                redirectTo="/admin/cumple"
                icon="trash"
                label="eliminar"
                detail="borra sus respuestas y su roki"
              />
            </SupportItem>
          </ul>
        </section>
      </main>
    </div>
  );
}

function Header({ guest }: { guest: BirthdayGuest }) {
  const visit = visitLabel(guest);
  const detail = [
    guest.firstSeenAt ? `abrió el ${formatDay(guest.firstSeenAt)}` : visit,
    guest.scratchedAt ? "raspó" : null,
    guest.lastSeenAt
      ? `último ingreso ${formatTimeAgo(guest.lastSeenAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-4">
      <span className="flex size-[84px] shrink-0 items-end justify-center overflow-hidden rounded-2xl border-[1.5px] border-rule text-ink">
        {/* TODO: dibujar su roki cuando exista el render de trazos (PR 6). */}
        <LogoMark size={64} className="translate-y-2" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-[2.5rem] leading-none font-bold tracking-[-0.015em]">
          {guest.name}
        </h1>
        <p className="text-card-meta text-faded">{detail}</p>
      </div>
    </div>
  );
}

function NewGuestCard({
  name,
  message,
  whatsapp,
  preview,
}: {
  name: string;
  message: string;
  whatsapp: string;
  /** La imagen que arma WhatsApp al pegar el link (`opengraph-image.tsx`). */
  preview: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.015em]">
        listo, {name} ya tiene su link :)
      </h1>
      <div className="flex flex-col gap-2">
        <span className="text-entry-meta text-faded">así le va a llegar</span>
        {/* biome-ignore lint/performance/noImgElement: es una imagen generada por la propia app; next/image no aporta nada acá */}
        <img
          src={preview}
          alt={`La vista previa de la invitación de ${name}`}
          width={1200}
          height={630}
          className="h-auto w-full rounded-xl border-[1.5px] border-rule"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-entry-meta text-faded">
          el mensaje (lo puedes cambiar en WhatsApp)
        </span>
        <p className="rounded-lg border-[1.5px] border-ink px-3.5 py-3 text-body whitespace-pre-line [overflow-wrap:anywhere]">
          {message}
        </p>
      </div>
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-ink text-action text-paper"
      >
        <MessageCircle className="size-5" aria-hidden />
        enviar por WhatsApp
      </a>
      <div className="grid grid-cols-2 gap-2.5">
        <CopyButton text={message} label="copiar mensaje" />
        <Link
          href="/admin/cumple/new"
          className="flex h-11 items-center justify-center rounded-full border-[1.5px] border-ink text-action text-ink"
        >
          otro invitado
        </Link>
      </div>
    </section>
  );
}

function SupportItem({ children }: { children: React.ReactNode }) {
  return <li className="border-t border-rule first:border-t-0">{children}</li>;
}
