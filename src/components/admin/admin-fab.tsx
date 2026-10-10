"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { SESSION_HINT_COOKIE } from "@/lib/auth/session-hint";
import {
  clampFabPosition,
  DRAG_THRESHOLD,
  dragFabPosition,
  FAB_SIZE,
  type FabPosition,
  loadFabPosition,
  saveFabPosition,
} from "./fab-position";

type AdminFabProps = {
  /** La nota que se está viendo, para editarla, ocultarla o eliminarla. */
  entry?: { id: string; title: string };
};

function hasAdminHint(): boolean {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${SESSION_HINT_COOKIE}=`));
}

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

const ITEM_BASE =
  "block cursor-pointer rounded-md px-3 py-2 text-action outline-none data-[highlighted]:bg-rule/60";
const ITEM = `${ITEM_BASE} text-ink`;
// Eliminar va atenuado, como en el panel de datos de la nota.
const ITEM_FADED = `${ITEM_BASE} text-faded`;

/**
 * El acceso al panel desde el sitio público. Solo aparece con sesión de admin
 * (ver `SESSION_HINT_COOKIE`): un visitante no lo ve ni descarga nada extra.
 *
 * Tocarlo abre el menú; arrastrarlo lo mueve, por si tapa algo, y la posición
 * queda guardada en este navegador. En una nota suma editar, ocultar (pasa a
 * borrador) y eliminar.
 */
export function AdminFab({ entry }: AdminFabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<FabPosition | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; login?: boolean }>();
  const drag = useRef<{
    x: number;
    y: number;
    start: FabPosition;
    moved: boolean;
  } | null>(null);

  // La cookie y la posición solo existen en el navegador: se leen al montar,
  // así el HTML estático es el mismo para todos.
  useEffect(() => {
    if (!hasAdminHint()) return;
    setVisible(true);
    setPosition(clampFabPosition(loadFabPosition(), viewport()));

    const onResize = () =>
      setPosition((current) =>
        current ? clampFabPosition(current, viewport()) : current,
      );
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!visible || !position) return null;

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !position) return;
    // Radix abre el menú en `pointerdown`; acá se espera a saber si es un
    // toque o un arrastre, y se abre a mano al soltar.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      start: position,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    current.moved = true;
    setPosition(dragFabPosition(current.start, dx, dy, viewport()));
  }

  function onPointerUp() {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (current.moved) {
      if (position) saveFabPosition(position);
    } else {
      setOpen((wasOpen) => !wasOpen);
    }
  }

  async function act(
    request: () => Promise<Response>,
    failure: string,
  ): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const res = await request();
      if (res.status === 401) {
        setError({ text: "Tu sesión venció.", login: true });
        return;
      }
      if (!res.ok) {
        setError({ text: failure });
        return;
      }
      // La nota ya no es pública: su página va a dar 404.
      router.push("/");
      router.refresh();
    } catch {
      setError({ text: failure });
    } finally {
      setBusy(false);
    }
  }

  function hide() {
    if (!entry) return;
    void act(
      () =>
        fetch(`/api/admin/logbook/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        }),
      "No se pudo ocultar la nota.",
    );
  }

  function remove() {
    if (!entry) return;
    if (!confirm(`¿Eliminar «${entry.title}»? No se puede deshacer.`)) return;
    void act(
      () => fetch(`/api/admin/logbook/${entry.id}`, { method: "DELETE" }),
      "No se pudo eliminar la nota.",
    );
  }

  return (
    <div
      className="fixed z-50 flex flex-col items-end gap-2 print:hidden"
      style={{ right: position.right, bottom: position.bottom }}
    >
      {error && (
        <p
          role="alert"
          className="max-w-[240px] rounded-md bg-ink px-3 py-2 text-card-meta text-paper"
        >
          {error.text}{" "}
          {error.login && (
            <Link
              href={`/admin/login?next=${encodeURIComponent(pathname)}`}
              className="underline underline-offset-4"
            >
              entrar
            </Link>
          )}
        </p>
      )}
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger
          aria-label="admin"
          disabled={busy}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
          className="flex touch-none items-center justify-center rounded-full bg-bottle text-paper shadow-lg ring-2 ring-paper select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-60"
          style={{ width: FAB_SIZE, height: FAB_SIZE, cursor: "grab" }}
        >
          <LogoMark size={26} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            collisionPadding={8}
            className="z-50 min-w-44 rounded-lg border border-rule bg-paper p-1 shadow-lg"
          >
            <DropdownMenu.Item asChild className={ITEM}>
              <Link href="/admin">panel</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild className={ITEM}>
              <Link href="/admin/logbook/new">nueva nota</Link>
            </DropdownMenu.Item>
            {entry && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-rule" />
                <DropdownMenu.Item asChild className={ITEM}>
                  <Link href={`/admin/logbook/${entry.id}`}>editar</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item className={ITEM} onSelect={hide}>
                  ocultar
                </DropdownMenu.Item>
                <DropdownMenu.Item className={ITEM_FADED} onSelect={remove}>
                  eliminar
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
