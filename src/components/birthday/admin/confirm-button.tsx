"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Eraser, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { request } from "./request";

const ICONS = { eraser: Eraser, refresh: RefreshCw, trash: Trash2 } as const;

/**
 * Una acción de soporte que pide confirmación antes de hacerse: regenerar un
 * link, borrar un roki, eliminar a alguien. Se abre como hoja desde abajo, al
 * alcance del pulgar, igual que en Figma.
 *
 * Recibe la acción como URL y método, y no como función, porque la arma un
 * Server Component y las funciones no cruzan esa frontera. Por lo mismo arma
 * su propio botón en vez de recibirlo como hijo: el `Slot` de Radix 1.1 no
 * reconoce como elemento lo que llega renderizado desde el servidor, y en el
 * HTML inicial el botón salía vacío.
 */
export function ConfirmButton({
  icon,
  label,
  detail,
  title,
  description,
  confirmLabel,
  url,
  method,
  redirectTo,
}: {
  icon: keyof typeof ICONS;
  label: string;
  detail: string;
  title: string;
  description: string;
  confirmLabel: string;
  url: string;
  method: "POST" | "DELETE";
  /** A dónde ir después; sin esto, se recarga la misma pantalla. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = ICONS[icon];

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await request(url, method);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger className="flex w-full items-center gap-3 py-3 text-left">
        <Icon className="size-5" aria-hidden />
        <span className="flex flex-col gap-0.5">
          <span className="text-body text-ink">{label}</span>
          <span className="text-card-meta text-faded">{detail}</span>
        </span>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/55" />
        <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[560px] flex-col gap-3.5 rounded-t-[28px] bg-paper px-5 pt-3 pb-9 md:bottom-auto md:top-1/3 md:rounded-[28px]">
          <span
            className="mx-auto h-[5px] w-10 rounded-full bg-rule"
            aria-hidden
          />
          <AlertDialog.Title className="text-card-title">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-body text-ink">
            {description}
          </AlertDialog.Description>
          {error && <p className="text-card-meta text-leaf">{error}</p>}
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="h-[52px] rounded-full bg-ink text-action text-paper disabled:opacity-60"
          >
            {busy ? "un momento…" : confirmLabel}
          </button>
          <AlertDialog.Cancel className="h-[52px] rounded-full border-[1.5px] border-ink text-action text-ink">
            cancelar
          </AlertDialog.Cancel>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
