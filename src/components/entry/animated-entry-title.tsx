"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";
import { revealElapsedMs } from "@/lib/motion/reveal";
import {
  DURATION,
  EASE,
  MOTION_OK,
  REVEAL_DEADLINE_MS,
  STAGGER,
} from "@/lib/motion/tokens";

gsap.registerPlugin(useGSAP, SplitText);

/** Desfase entre líneas: más que entre letras, porque cada una es más larga. */
const LINE_STAGGER = STAGGER * 2;

/**
 * El título de la nota, que sube línea a línea desde detrás de su propio
 * renglón, como si se escribiera de abajo hacia arriba.
 *
 * Entra cada vez que se abre una nota, también navegando desde el home: por
 * eso mide el atraso con `revealElapsedMs` y no con `performance.now()`.
 *
 * El HTML del servidor trae el título entero. Si el JS no llega o se pidió
 * reducir el movimiento, eso es lo que se ve.
 */
export function AnimatedEntryTitle({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  const root = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const el = root.current;
        if (!el) return;
        const late = revealElapsedMs(el) > REVEAL_DEADLINE_MS;
        gsap.set(el, { visibility: "visible" });
        if (late) return;

        // Las líneas dependen del ancho y de la fuente: `autoSplit` vuelve a
        // partir si cambia alguno a mitad de camino (la fuente que termina de
        // cargar, el celular que gira) y retoma la animación donde iba.
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "entry-title-line",
          autoSplit: true,
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 100,
              duration: DURATION.long,
              ease: EASE.enter,
              stagger: LINE_STAGGER,
              // Al terminar vuelve el texto original, que se reacomoda solo
              // si después cambia el ancho.
              onComplete: () => split.revert(),
            }),
        });
      });
    },
    { scope: root },
  );

  return (
    <h1 ref={root} data-motion="title" className={className}>
      {children}
    </h1>
  );
}
