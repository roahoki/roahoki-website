"use client";

import { ArrowLeft, ArrowRight, Vibrate } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Attendee } from "@/lib/birthday/queries";
import { MOTION_OK } from "@/lib/motion/tokens";
import { RokiFigure } from "./roki-figure";
import { RokiPile, type RokiPileHandle } from "./roki-pile";

const SLIDES = ["montoncito", "foto de curso"] as const;

/**
 * Quiénes van, como carrusel de dos láminas (Figma: invitado v3, trote): el
 * montoncito con física y la foto de curso en grilla.
 *
 * Se cambia con las flechas o deslizando, pero nunca deslizando sobre la pila:
 * ahí el dedo arrastra rokis. Por eso las flechas y los puntos van fuera de la
 * tarjeta, y en vez de "desliza" (que a Joaquín le pareció poco intuitivo).
 *
 * Con movimiento reducido parte en la foto de curso, que no se mueve.
 */
export function WhoIsGoing({
  attendees,
  meId,
  color,
  onTapMine,
}: {
  attendees: Attendee[];
  meId: string;
  color: string;
  onTapMine: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const pile = useRef<RokiPileHandle>(null);
  const swipe = useRef<number | null>(null);

  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) setSlide(1);
  }, []);

  const count =
    attendees.length === 0
      ? "todavía nadie, ¿partes tú?"
      : attendees.length === 1
        ? "va 1"
        : `van ${attendees.length}`;
  const mine = attendees.some((attendee) => attendee.id === meId);

  const go = (to: number) =>
    setSlide(Math.max(0, Math.min(SLIDES.length - 1, to)));
  const swipeHandlers = {
    onPointerDown: (event: React.PointerEvent) => {
      swipe.current = event.clientX;
    },
    onPointerUp: (event: React.PointerEvent) => {
      if (swipe.current === null) return;
      const dx = event.clientX - swipe.current;
      swipe.current = null;
      if (Math.abs(dx) > 50) go(slide + (dx < 0 ? 1 : -1));
    },
  };

  const arrow =
    "flex size-12 items-center justify-center rounded-full disabled:opacity-35";

  return (
    <section aria-labelledby="quienes-van" className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl bg-paper text-ink">
        <div
          className="flex items-start justify-between px-4 pt-3.5"
          {...swipeHandlers}
        >
          <div>
            <h2 id="quienes-van" className="text-card-title-sm">
              {SLIDES[slide]}
            </h2>
            <p className="text-entry-meta text-faded">{count}</p>
          </div>
          {slide === 0 && attendees.length > 0 && (
            <button
              type="button"
              onClick={() => pile.current?.shake()}
              className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-ink"
              aria-label="terremoto: sacudir la pila"
              title="terremoto"
            >
              <Vibrate className="size-5" aria-hidden />
            </button>
          )}
        </div>

        {attendees.length > 0 &&
          (slide === 0 ? (
            <RokiPile
              ref={pile}
              attendees={attendees}
              meId={meId}
              color={color}
              onTapMine={onTapMine}
            />
          ) : (
            <ul
              className="grid touch-pan-y grid-cols-4 gap-x-2 gap-y-4 px-4 pt-4 pb-5"
              {...swipeHandlers}
            >
              {attendees.map((attendee) => {
                const me = attendee.id === meId;
                const figure = (
                  <>
                    <RokiFigure
                      roki={attendee.roki}
                      color={color}
                      size={64}
                      label={me ? "tu roki" : `el roki de ${attendee.name}`}
                    />
                    <span className="max-w-full truncate text-card-meta">
                      {me ? "tú" : attendee.name}
                    </span>
                  </>
                );
                return (
                  <li
                    key={attendee.id}
                    className="flex flex-col items-center gap-1"
                  >
                    {me ? (
                      <button
                        type="button"
                        onClick={onTapMine}
                        className="flex flex-col items-center gap-1"
                        aria-label={
                          attendee.roki
                            ? "redibujar tu roki"
                            : "dibujar tu roki"
                        }
                      >
                        {figure}
                      </button>
                    ) : (
                      figure
                    )}
                  </li>
                );
              })}
            </ul>
          ))}

        {mine && (
          <p className="px-4 pb-4 text-card-meta text-faded">
            toca tu roki para{" "}
            {attendees.find((a) => a.id === meId)?.roki
              ? "redibujarlo"
              : "dibujarlo"}
            {slide === 0 ? ", arrastra a los demás" : ""}
          </p>
        )}
      </div>

      <nav
        aria-label="cambiar de vista"
        className="flex items-center justify-between"
        {...swipeHandlers}
      >
        <button
          type="button"
          onClick={() => go(slide - 1)}
          disabled={slide === 0}
          className={`${arrow} border-[1.5px] border-paper`}
          aria-label={`ver ${SLIDES[0]}`}
        >
          <ArrowLeft className="size-[22px]" aria-hidden />
        </button>
        <span className="flex items-center gap-2" aria-hidden>
          {SLIDES.map((name, index) => (
            <span
              key={name}
              className={`rounded-full ${index === slide ? "size-2.5 bg-paper" : "size-2 border-[1.5px] border-paper"}`}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={() => go(slide + 1)}
          disabled={slide === SLIDES.length - 1}
          className={`${arrow} bg-paper`}
          style={{ color }}
          aria-label={`ver ${SLIDES[1]}`}
        >
          <ArrowRight className="size-[22px]" aria-hidden />
        </button>
      </nav>
    </section>
  );
}
