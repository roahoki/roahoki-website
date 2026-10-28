"use client";

import { ArrowLeft, ArrowRight, Vibrate } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Attendee } from "@/lib/birthday/queries";
import { MOTION_OK } from "@/lib/motion/tokens";
import { RokiFigure } from "./roki-figure";
import { RokiPile, type RokiPileHandle } from "./roki-pile";

/**
 * Alto del montoncito. Más bajo que la pantalla del celular a propósito: que
 * siempre quede página arriba o abajo para seguir bajando.
 */
const PILE_HEIGHT = 300;

/**
 * Quiénes van, como carrusel de dos láminas (Figma: invitado v3, trote): el
 * montoncito con física y la foto de curso en grilla.
 *
 * Se cambia con las flechas o deslizando, pero nunca deslizando sobre la pila:
 * ahí el dedo arrastra rokis. Por eso las flechas y los puntos van fuera de la
 * tarjeta, y en vez de "desliza" (que a Joaquín le pareció poco intuitivo).
 *
 * Con movimiento reducido parte en la foto de curso, que no se mueve.
 *
 * El recuadro no cambia de alto entre vistas ni cuando todavía no va nadie: un
 * salto de alto movía la página bajo el dedo.
 */
export function WhoIsGoing({
  attendees,
  meId,
  color,
  onTapMine,
  lead,
}: {
  attendees: Attendee[];
  meId: string;
  color: string;
  onTapMine: () => void;
  lead?: { title: string; content: ReactNode };
}) {
  const slides = [...(lead ? [lead.title] : []), "montoncito", "foto de curso"];
  const pileAt = lead ? 1 : 0;
  const [slide, setSlide] = useState(0);
  const pile = useRef<RokiPileHandle>(null);
  const swipe = useRef<number | null>(null);

  useEffect(() => {
    // La cumbre no se mueve sola; el montoncito sí.
    if (!lead && !window.matchMedia(MOTION_OK).matches) setSlide(1);
  }, [lead]);

  const count =
    attendees.length === 0
      ? "todavía nadie, ¿partes tú?"
      : attendees.length === 1
        ? "va 1"
        : `van ${attendees.length}`;
  const mine = attendees.some((attendee) => attendee.id === meId);

  const go = (to: number) =>
    setSlide(Math.max(0, Math.min(slides.length - 1, to)));
  const isLead = Boolean(lead) && slide === 0;
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

  const myRoki = attendees.find((attendee) => attendee.id === meId)?.roki;
  const hint = (pile: boolean) =>
    mine && (
      <p className="px-4 pb-4 text-card-meta text-faded">
        toca tu roki para {myRoki ? "redibujarlo" : "dibujarlo"}
        {pile ? ", arrastra a los demás" : ""}
      </p>
    );

  // Todas las vistas viven en la misma celda de la grilla y las que no se ven
  // quedan invisibles pero ocupando lugar: el recuadro mide lo que la más alta
  // y no cambia de tamaño al pasar de una a otra ni cuando no va nadie.
  const layer = (index: number) => {
    const shown = index === slide;
    return {
      className: `[grid-area:1/1] flex flex-col ${shown ? "" : "invisible"}`,
      "aria-hidden": !shown,
      inert: !shown,
    };
  };
  const gridAt = pileAt + 1;

  return (
    <section aria-labelledby="quienes-van" className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl bg-paper text-ink">
        <div
          className="flex min-h-14 items-start justify-between px-4 pt-3.5"
          {...swipeHandlers}
        >
          <div>
            <h2 id="quienes-van" className="text-card-title-sm">
              {slides[slide]}
            </h2>
            <p
              className={`text-entry-meta text-faded ${isLead ? "invisible" : ""}`}
              aria-hidden={isLead}
            >
              {count}
            </p>
          </div>
          {slide === pileAt && attendees.length > 0 && (
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

        <div className="grid">
          {lead && <div {...layer(0)}>{lead.content}</div>}

          <div {...layer(pileAt)}>
            {attendees.length === 0 ? (
              <EmptyPile color={color} />
            ) : slide === pileAt ? (
              // La física corre solo mientras se ve; si no, el hueco del
              // mismo alto guarda el lugar.
              <RokiPile
                ref={pile}
                attendees={attendees}
                meId={meId}
                color={color}
                height={PILE_HEIGHT}
                onTapMine={onTapMine}
              />
            ) : (
              <div style={{ height: PILE_HEIGHT }} />
            )}
            {hint(true)}
          </div>

          <div {...layer(gridAt)}>
            {attendees.length === 0 ? (
              <EmptyPile color={color} />
            ) : (
              <ul
                className="grid touch-pan-y grid-cols-4 content-start gap-x-2 gap-y-4 px-4 pt-4 pb-5"
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
            )}
            <div className="mt-auto">{hint(false)}</div>
          </div>
        </div>
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
          aria-label={`ver ${slides[Math.max(0, slide - 1)]}`}
        >
          <ArrowLeft className="size-[22px]" aria-hidden />
        </button>
        <span className="flex items-center gap-2" aria-hidden>
          {slides.map((name, index) => (
            <span
              key={name}
              className={`rounded-full ${index === slide ? "size-2.5 bg-paper" : "size-2 border-[1.5px] border-paper"}`}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={() => go(slide + 1)}
          disabled={slide === slides.length - 1}
          className={`${arrow} bg-paper`}
          style={{ color }}
          aria-label={`ver ${slides[Math.min(slides.length - 1, slide + 1)]}`}
        >
          <ArrowRight className="size-[22px]" aria-hidden />
        </button>
      </nav>
    </section>
  );
}

/** Lo que ocupa el lugar de los rokis mientras nadie dice voy. */
function EmptyPile({ color }: { color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ height: PILE_HEIGHT }}
    >
      <div className="opacity-30">
        <RokiFigure roki={null} color={color} size={88} />
      </div>
      <p className="text-entry-meta text-faded">
        acá van cayendo los rokis de quienes van
      </p>
    </div>
  );
}
