"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  BIRTHDAY_EVENTS,
  DEFAULT_INVITED_EVENTS,
  type EventSlug,
} from "@/lib/birthday/events";
import { request } from "./request";

export type GuestFormValues = {
  id?: string;
  name: string;
  phone: string;
  personalMessage: string;
  invitedEvents: EventSlug[];
};

const EMPTY: GuestFormValues = {
  name: "",
  phone: "",
  personalMessage: "",
  invitedEvents: [...DEFAULT_INVITED_EVENTS],
};

const fieldClass =
  "w-full rounded-lg border-[1.5px] border-rule bg-transparent px-3.5 py-3 text-body text-ink outline-none placeholder:text-faded focus:border-ink";

/**
 * Alta y edición de un invitado. Al crear, lleva a la pantalla de "link listo"
 * con el mensaje armado para WhatsApp; al editar, vuelve a su ficha.
 */
export function GuestForm({ initial }: { initial?: GuestFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<GuestFormValues>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(initial?.id);

  function toggle(slug: EventSlug) {
    setValues((prev) => ({
      ...prev,
      invitedEvents: prev.invitedEvents.includes(slug)
        ? prev.invitedEvents.filter((event) => event !== slug)
        : [...prev.invitedEvents, slug],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: values.name,
      phone: values.phone,
      personalMessage: values.personalMessage,
      invitedEvents: values.invitedEvents,
    };
    const result = editing
      ? await request<{ guest: { id: string } }>(
          `/api/admin/birthday/guests/${initial?.id}`,
          "PATCH",
          body,
        )
      : await request<{ guest: { id: string } }>(
          "/api/admin/birthday/guests",
          "POST",
          body,
        );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const id = result.data.guest.id;
    router.push(`/admin/cumple/guests/${id}${editing ? "" : "?nuevo=1"}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-4 pt-5 pb-32 md:px-0">
        <h1 className="text-entry-title">
          {editing ? `editar a ${initial?.name}` : "nuevo invitado"}
        </h1>

        <label className="flex flex-col gap-2">
          <span className="text-entry-meta text-faded">nombre</span>
          <input
            className={fieldClass}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            required
            maxLength={60}
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-entry-meta text-faded">
            teléfono, para mandarle el link por WhatsApp
          </span>
          <input
            className={fieldClass}
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            inputMode="tel"
            placeholder="+56 9 8765 4321"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-entry-meta text-faded">mensaje personal</span>
          <textarea
            className={`${fieldClass} min-h-28 resize-y`}
            value={values.personalMessage}
            onChange={(e) =>
              setValues({ ...values, personalMessage: e.target.value })
            }
            maxLength={600}
          />
        </label>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-entry-meta text-faded">
            qué planes ve
          </legend>
          <div className="flex flex-wrap gap-2">
            {BIRTHDAY_EVENTS.map((plan) => {
              const on = values.invitedEvents.includes(plan.slug);
              return (
                <label
                  key={plan.slug}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] pr-3.5 pl-2.5 text-action has-[:focus-visible]:outline-2"
                  style={
                    on
                      ? {
                          backgroundColor: plan.color,
                          borderColor: plan.color,
                          color: "var(--paper)",
                        }
                      : { borderColor: plan.color, color: plan.color }
                  }
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => toggle(plan.slug)}
                  />
                  {on ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <span className="size-3.5 rounded-full border-[1.5px] border-current" />
                  )}
                  {plan.title}
                </label>
              );
            })}
          </div>
          <p className="text-card-meta text-faded">
            Por defecto, todos menos el cóctel. Un plan que no ve no existe para
            esa persona: no aparece ni bloqueado.
          </p>
        </fieldset>

        {error && (
          <p role="alert" className="text-entry-meta text-leaf">
            {error}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper px-4 pt-3 pb-7 md:static md:border-0 md:px-0">
        <button
          type="submit"
          disabled={busy}
          className="h-[52px] w-full rounded-full bg-ink text-action text-paper disabled:opacity-60 md:w-auto md:px-8"
        >
          {busy ? "guardando…" : editing ? "guardar" : "crear y armar su link"}
        </button>
      </div>
    </form>
  );
}
