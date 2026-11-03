"use client";

import { Minus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { EventSlug } from "@/lib/birthday/events";
import type { WhatsappRsvp } from "@/lib/birthday/queries";
import {
  firstErrorMessage,
  partySizeInputSchema,
  whatsappRsvpInputSchema,
} from "@/lib/schemas/birthday";
import { request } from "./request";

/**
 * Quienes confirmaron por WhatsApp, sin link: la familia del cóctel. Cada fila
 * es un grupo con cuántos vienen, que se corrige con − y + y se saca con ×.
 * Abajo, anotar uno nuevo. El total suma al "van" del plan.
 */
export function WhatsappRsvpsPanel({
  event,
  rsvps,
}: {
  event: EventSlug;
  rsvps: WhatsappRsvp[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {rsvps.length === 0 ? (
        <p className="text-body text-faded">
          Nadie anotado todavía. Quien te confirme por WhatsApp va acá.
        </p>
      ) : (
        <ul>
          {rsvps.map((rsvp) => (
            <WhatsappRsvpRow
              // Remonta si el número cambia desde el servidor.
              key={`${rsvp.id}-${rsvp.partySize}`}
              rsvp={rsvp}
            />
          ))}
        </ul>
      )}
      <AddForm event={event} />
    </div>
  );
}

const roundButton =
  "flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink disabled:opacity-40";

function WhatsappRsvpRow({ rsvp }: { rsvp: WhatsappRsvp }) {
  const router = useRouter();
  // El número cambia al toque y vuelve atrás si no se guardó.
  const [size, setSize] = useState(rsvp.partySize);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: number) {
    const parsed = partySizeInputSchema.safeParse({ partySize: next });
    if (!parsed.success) return;
    const before = size;
    setSize(next);
    setBusy(true);
    setError(null);
    const result = await request(
      `/api/admin/birthday/whatsapp-rsvps/${rsvp.id}`,
      "PATCH",
      parsed.data,
    );
    setBusy(false);
    if (!result.ok) {
      setSize(before);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`¿Sacar a ${rsvp.name} de la lista?`)) return;
    setBusy(true);
    const result = await request(
      `/api/admin/birthday/whatsapp-rsvps/${rsvp.id}`,
      "DELETE",
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-1 border-t border-rule py-2.5 first:border-t-0">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-card-title-sm">{rsvp.name}</span>
        <button
          type="button"
          onClick={() => change(size - 1)}
          disabled={busy || size <= 1}
          className={roundButton}
          aria-label={`uno menos en ${rsvp.name}`}
        >
          <Minus className="size-[18px]" aria-hidden />
        </button>
        <output
          className="w-8 text-center text-card-title-sm tabular-nums"
          aria-label={`${rsvp.name}: ${size}`}
        >
          {size}
        </output>
        <button
          type="button"
          onClick={() => change(size + 1)}
          disabled={busy}
          className={roundButton}
          aria-label={`uno más en ${rsvp.name}`}
        >
          <Plus className="size-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-faded"
          aria-label={`sacar a ${rsvp.name}`}
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}
    </li>
  );
}

const field =
  "rounded-lg border-[1.5px] border-rule bg-transparent px-3.5 py-2.5 text-body text-ink outline-none placeholder:text-faded focus:border-ink";

function AddForm({ event }: { event: EventSlug }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = whatsappRsvpInputSchema.safeParse({
      event,
      name,
      partySize,
    });
    if (!parsed.success) {
      setError(firstErrorMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await request(
      "/api/admin/birthday/whatsapp-rsvps",
      "POST",
      parsed.data,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setPartySize("1");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="tía Carmen"
          aria-label="nombre"
          className={`${field} min-w-0 flex-1`}
        />
        <input
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          type="number"
          inputMode="numeric"
          min={1}
          max={30}
          aria-label="cuántos vienen"
          className={`${field} w-16 text-center`}
        />
        <button
          type="submit"
          disabled={busy}
          className="h-11 shrink-0 rounded-full bg-ink px-4 text-action text-paper disabled:opacity-60"
        >
          anotar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}
    </form>
  );
}
