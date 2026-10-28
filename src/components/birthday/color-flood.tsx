"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type ReactNode, useRef } from "react";
import { DURATION, EASE, MOTION_OK } from "@/lib/motion/tokens";

gsap.registerPlugin(useGSAP);

/** Dónde tocó el invitado la tarjeta del plan, para que el color nazca ahí. */
export const TAP_KEY = "cumple:tap";

/**
 * La página de un plan entra como su color creciendo desde el dedo y llenando
 * la pantalla (experimento 2 del laboratorio). La tarjeta del lineup guarda el
 * punto del toque en `sessionStorage` justo antes de navegar.
 *
 * Sin toque guardado (link directo, recarga) o con movimiento reducido, la
 * página aparece quieta.
 */
export function ColorFlood({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Se lee sin borrar: en desarrollo React corre el efecto dos veces y
    // deshace la primera animación; si la primera vuelta borrara el toque, la
    // segunda no lo encontraría. Se borra al terminar.
    let tap: { x: number; y: number } | null = null;
    try {
      const raw = sessionStorage.getItem(TAP_KEY);
      tap = raw ? JSON.parse(raw) : null;
    } catch {
      tap = null;
    }
    const forget = () => {
      try {
        sessionStorage.removeItem(TAP_KEY);
      } catch {
        // Sin almacenamiento no hay nada que borrar.
      }
    };
    if (!tap || !root.current) return;
    const { x, y } = tap;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      gsap.fromTo(
        root.current,
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        {
          clipPath: `circle(${radius}px at ${x}px ${y}px)`,
          duration: DURATION.base,
          ease: EASE.enter,
          clearProps: "clipPath",
          onComplete: forget,
        },
      );
    });
    // Con movimiento reducido no hay animación que espere el toque.
    mm.add("(prefers-reduced-motion: reduce)", forget);
  });

  return (
    <div
      ref={root}
      className="min-h-dvh text-paper"
      style={{ backgroundColor: color }}
    >
      {children}
    </div>
  );
}
