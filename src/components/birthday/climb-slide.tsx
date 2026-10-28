"use client";

import { useEffect, useRef, useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import {
  altitudeAt,
  CLIMB_VIEWBOX,
  formatAltitude,
  PROFILE,
  pointAt,
  progressAt,
  SUMMIT_AT,
  trailUpTo,
} from "@/lib/birthday/climb";
import type { EventSlug } from "@/lib/birthday/events";
import type { Roki } from "@/lib/birthday/roki";
import { RokiFigure } from "./roki-figure";
import { useRsvp } from "./use-rsvp";

/**
 * La cumbre del Manquehue (Figma: invitado v3, "la cumbre"): arrastrar el roki
 * cerro arriba es decir voy. Si se suelta antes de la cumbre, vuelve a la base.
 *
 * Para quien no puede o no quiere arrastrar (teclado, lector de pantalla, apuro)
 * están "confirmar sin subir" y "no voy", dentro de la misma tarjeta.
 */
export function ClimbSlide({
  token,
  event,
  color,
  initial,
  roki,
  onGoing,
}: {
  token: string;
  event: EventSlug;
  color: string;
  initial: RsvpStatus | null;
  roki: Roki | null;
  onGoing: () => void;
}) {
  const { status, error, answer } = useRsvp({ token, event, initial, onGoing });
  const [progress, setProgress] = useState(status === "going" ? 1 : 0);
  const [dragging, setDragging] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  // Si la respuesta cambia por los links, el roki va a la cumbre o a la base.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo al cambiar la respuesta
  useEffect(() => {
    if (!dragging) glideTo(status === "going" ? 1 : 0);
  }, [status]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** Desliza el roki por el sendero hasta `target`, frenando al final. */
  function glideTo(target: number) {
    cancelAnimationFrame(frame.current);
    const from = progressRef.current;
    const started = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - started) / 500);
      const eased = 1 - (1 - k) ** 3;
      setProgress(from + (target - from) * eased);
      if (k < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }
  const progressRef = useRef(progress);
  progressRef.current = progress;

  function follow(event: React.PointerEvent) {
    const rect = area.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * CLIMB_VIEWBOX.width;
    const y = ((event.clientY - rect.top) / rect.height) * CLIMB_VIEWBOX.height;
    setProgress(progressAt([x, y]));
  }

  async function release() {
    setDragging(false);
    if (progressRef.current >= SUMMIT_AT) {
      glideTo(1);
      if (!(await answer("going"))) glideTo(0);
      return;
    }
    // No llegó: vuelve a donde estaba (la cumbre si ya iba, la base si no).
    glideTo(status === "going" ? 1 : 0);
  }

  const [x, y] = pointAt(progress);
  const summit = status === "going";

  return (
    <div className="flex flex-col gap-1 px-4 pb-4">
      <p
        className="text-[2.75rem] leading-none font-bold tracking-[-0.02em] tabular-nums"
        style={{ color }}
        aria-live="polite"
      >
        {formatAltitude(altitudeAt(progress))}
      </p>
      <p className="text-entry-meta">
        {summit
          ? "¡llegaste! vas al manquehue :)"
          : "Arrastra a tu roki hasta arriba para confirmar."}
      </p>

      <div
        ref={area}
        className="relative mt-2 w-full touch-none select-none"
        style={{
          aspectRatio: `${CLIMB_VIEWBOX.width} / ${CLIMB_VIEWBOX.height}`,
        }}
        onPointerMove={(event) => dragging && follow(event)}
        onPointerUp={() => dragging && release()}
        onPointerCancel={() => dragging && release()}
      >
        <svg
          viewBox={`0 0 ${CLIMB_VIEWBOX.width} ${CLIMB_VIEWBOX.height}`}
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <polyline
            points={PROFILE.map(([px, py]) => `${px},${py}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="3 4"
          />
          <polyline
            points={trailUpTo(progress)}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="absolute top-[3%] right-[24%] text-card-meta text-ink"
          aria-hidden
        >
          cumbre · {formatAltitude(altitudeAt(1))}
        </span>
        <button
          type="button"
          aria-label={
            summit
              ? "tu roki en la cumbre"
              : "tu roki: arrástralo hasta la cumbre"
          }
          className={`absolute cursor-grab touch-none ${dragging ? "cursor-grabbing" : ""}`}
          style={{
            left: `${(x / CLIMB_VIEWBOX.width) * 100}%`,
            top: `${(y / CLIMB_VIEWBOX.height) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
          onPointerDown={(event) => {
            cancelAnimationFrame(frame.current);
            area.current?.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
        >
          <RokiFigure roki={roki} color={color} size={44} />
        </button>
      </div>

      <div className="mt-2 flex gap-5 text-entry-meta text-faded">
        {!summit && (
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => answer("going")}
          >
            confirmar sin subir
          </button>
        )}
        {status !== "not_going" && (
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => answer("not_going")}
          >
            no voy
          </button>
        )}
        {status === "not_going" && (
          <span>no vas. si cambias de opinión, sube :)</span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-entry-meta text-leaf">
          {error}
        </p>
      )}
    </div>
  );
}
