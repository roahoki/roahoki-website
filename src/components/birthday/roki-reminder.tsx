"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { MOTION_OK } from "@/lib/motion/tokens";

/**
 * Roki, el de la marca, en la esquina de la pantalla avisando cuántos planes
 * faltan por responder. Es el hermano del botón flotante del admin
 * (`AdminFab`): mismo círculo botella con roki en papel. Reemplaza al recuadro
 * verde de pendientes, que sobre el color de los planes no se leía.
 *
 * Tocarlo (a él o a su globo) baja al siguiente plan sin responder. Cuando se
 * responde el último, dice "¡listo! gracias :)" un rato y se va. Si al entrar
 * ya estaba todo respondido, no aparece.
 *
 * Se esconde al llegar a la hoja del final (`data-page-end`) para no tapar los
 * botones de guardar.
 */

export type PendingPlan = { path: string; title: string };

/** Cuánto dura el "¡listo!" antes de que roki se vaya. */
const DONE_MS = 2600;

export function reminderText(pending: readonly PendingPlan[]): string {
  if (pending.length === 0) return "¡listo! gracias :)";
  if (pending.length === 1)
    return `te falta confirmar el ${pending[0].title} :)`;
  return `te faltan ${pending.length} por confirmar :)`;
}

export function RokiReminder({ pending }: { pending: PendingPlan[] }) {
  // Solo aparece si al entrar faltaba algo.
  const [active, setActive] = useState(pending.length > 0);
  const [atEnd, setAtEnd] = useState(false);
  const hadPending = useRef(pending.length > 0);

  useEffect(() => {
    if (pending.length > 0) {
      hadPending.current = true;
      setActive(true);
      return;
    }
    if (!hadPending.current) return;
    const id = setTimeout(() => setActive(false), DONE_MS);
    return () => clearTimeout(id);
  }, [pending.length]);

  useEffect(() => {
    const end = document.querySelector("[data-page-end]");
    if (!end || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setAtEnd(entry.isIntersecting),
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  if (!active) return null;

  function goToNext() {
    if (pending.length === 0) return;
    const sections = pending
      .map((plan) => document.getElementById(plan.path))
      .filter((section): section is HTMLElement => section !== null);
    // El siguiente que todavía está más abajo; si ya pasaron todos, el primero.
    const next =
      sections.find(
        (section) =>
          section.getBoundingClientRect().top > window.innerHeight * 0.3,
      ) ?? sections[0];
    next?.scrollIntoView({
      behavior: window.matchMedia(MOTION_OK).matches ? "smooth" : "auto",
      block: "start",
    });
  }

  const text = reminderText(pending);

  return (
    <div
      className={`fixed right-4 z-30 flex items-end gap-2 transition-[opacity,translate] duration-300 motion-reduce:transition-none print:hidden ${
        atEnd ? "pointer-events-none translate-y-4 opacity-0" : ""
      }`}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      aria-hidden={atEnd}
    >
      <button
        type="button"
        onClick={goToNext}
        // El globo cambia de texto: se anuncia sin mover el foco.
        aria-live="polite"
        // `key`: al cambiar el número, el globo vuelve a entrar.
        key={text}
        className="mb-9 max-w-[220px] animate-fade-up rounded-2xl rounded-br-sm border-[1.5px] border-ink bg-paper px-3.5 py-2 text-left text-card-meta text-ink shadow-md motion-reduce:animate-none"
      >
        {text}
      </button>
      <button
        type="button"
        onClick={goToNext}
        aria-label={
          pending.length > 0
            ? `${text} Ir al siguiente plan sin responder.`
            : text
        }
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-bottle text-paper shadow-lg ring-2 ring-paper"
      >
        <LogoMark size={26} />
      </button>
    </div>
  );
}
