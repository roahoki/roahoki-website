"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { EventSlug } from "@/lib/birthday/events";
import { request } from "./request";

/** Pegar el link del álbum de iCloud de un plan. Vacío lo quita. */
export function AlbumForm({
  event,
  initialUrl,
}: {
  event: EventSlug;
  initialUrl: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const result = await request("/api/admin/birthday/albums", "PUT", {
      event,
      url,
    });
    if (!result.ok) {
      setState("idle");
      setError(result.error);
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setState("idle");
        }}
        placeholder="pega el link del álbum de iCloud"
        aria-label="link del álbum"
        className="w-full rounded-lg border-[1.5px] border-rule bg-transparent px-3.5 py-3 text-body text-ink outline-none placeholder:text-faded focus:border-ink"
      />
      <p className="text-card-meta text-faded">
        Al día siguiente del plan, cada invitado ve «ya pasó». Sin link ven
        «pronto les compartiré las fotos :)»; con link, un botón para verlas.
      </p>
      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "busy"}
        className="h-11 self-start rounded-full bg-ink px-5 text-action text-paper disabled:opacity-60"
      >
        {state === "saved" ? "guardado" : "guardar álbum"}
      </button>
    </form>
  );
}
