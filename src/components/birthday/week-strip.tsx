"use client";

import { useEffect, useState } from "react";
import { MOTION_OK } from "@/lib/motion/tokens";

/**
 * La semana del cumpleaños, pegada arriba mientras se baja por los planes
 * (bloque 3 del roadmap). Reemplaza al "agregar al calendario", que bajaba un
 * `.ics` que nadie entendía, y hace de índice: tocar un día baja a su plan.
 *
 * Cada día con plan lleva un punto por plan en su color, y el día del plan que
 * se está viendo se pinta entero. El sábado tiene dos (trote y carrete): tocarlo
 * lleva al primero, y tocarlo de nuevo, al segundo.
 *
 * Qué plan "se está viendo" lo decide la misma línea que usa `ScrollBackdrop`:
 * la mitad de la pantalla. Así el día marcado y el color de fondo cambian
 * juntos.
 */

export type WeekStripDay = {
  letter: string;
  date: number;
  plans: { path: string; title: string; color: string }[];
};

const NAMES: Record<string, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};

export function WeekStrip({ days }: { days: WeekStripDay[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = days
      .flatMap((day) => day.plans)
      .map((plan) => document.getElementById(plan.path))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) {
          setActive(hit.target.id);
          return;
        }
        if (sections[0].getBoundingClientRect().top > window.innerHeight / 2) {
          setActive(null);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [days]);

  function go(day: WeekStripDay) {
    // Si ya estás en un plan de ese día, el siguiente del mismo día.
    const here = day.plans.findIndex((plan) => plan.path === active);
    const target = day.plans[(here + 1) % day.plans.length];
    const section = document.getElementById(target.path);
    if (!section) return;
    section.scrollIntoView({
      behavior: window.matchMedia(MOTION_OK).matches ? "smooth" : "auto",
      block: "start",
    });
    // El ancla en la URL: si la comparte, se abre en ese plan.
    history.replaceState(null, "", `#${target.path}`);
  }

  return (
    <nav
      aria-label="la semana"
      className="sticky top-2 z-30 rounded-2xl border-[1.5px] border-rule bg-paper px-1.5 py-1.5 text-ink"
    >
      <ol className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const current = day.plans.find((plan) => plan.path === active);
          const label = day.plans.length
            ? `${NAMES[day.letter]} ${day.date}: ${day.plans.map((plan) => plan.title).join(" y ")}`
            : `${NAMES[day.letter]} ${day.date}, sin plan`;
          return (
            <li key={day.date}>
              <button
                type="button"
                disabled={day.plans.length === 0}
                onClick={() => go(day)}
                aria-label={label}
                aria-current={current ? "true" : undefined}
                className="flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors duration-300 disabled:text-faded"
                style={
                  current
                    ? { backgroundColor: current.color, color: "var(--paper)" }
                    : undefined
                }
              >
                <span className="text-card-meta opacity-70" aria-hidden>
                  {day.letter}
                </span>
                <span
                  className="text-action font-bold tabular-nums"
                  aria-hidden
                >
                  {day.date}
                </span>
                <span className="flex h-1.5 gap-1" aria-hidden>
                  {day.plans.map((plan) => (
                    <span
                      key={plan.path}
                      className="size-1.5 rounded-full"
                      style={{
                        // Sobre el día pintado, los puntos van en papel.
                        backgroundColor: current ? "var(--paper)" : plan.color,
                        opacity: current && plan !== current ? 0.5 : 1,
                      }}
                    />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
