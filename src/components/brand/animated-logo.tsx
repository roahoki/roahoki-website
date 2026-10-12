"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";
import {
  DURATION,
  EASE,
  MOTION_OK,
  REVEAL_DEADLINE_MS,
  STAGGER,
} from "@/lib/motion/tokens";
import { Logo } from "./logo";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, SplitText);

/** Los trazos de la figura, en orden: cabeza, hombro izquierdo y ojo. */
function markPaths(el: HTMLElement) {
  return Array.from(
    el.querySelectorAll<SVGPathElement>("[data-logo-part=mark] path"),
  );
}

/**
 * El logo del header, que se dibuja al cargar la página: primero la cabeza y
 * el hombro derecho de un solo trazo, después el hombro izquierdo y el ojo, y
 * mientras tanto "roahoki" sube letra a letra. Al pasar el mouse se vuelve a
 * dibujar.
 *
 * Pasa una sola vez por carga: el header vive en el layout, así que navegar
 * entre el home y una nota no lo vuelve a montar.
 *
 * El HTML del servidor trae el logo completo. Si el JS no llega o se pidió
 * reducir el movimiento, eso es lo que se ve.
 */
export function AnimatedLogo({ size }: { size?: number }) {
  const root = useRef<HTMLSpanElement>(null);
  const intro = useRef<gsap.core.Timeline | null>(null);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const el = root.current;
        if (!el) return;
        gsap.set(el, { visibility: "visible" });
        if (performance.now() > REVEAL_DEADLINE_MS) return;

        const [head, shoulder, eye] = markPaths(el);
        // Mientras dura, la palabra se anuncia por el `aria-label` que le pone
        // SplitText y las letras sueltas quedan ocultas al lector: leídas una
        // por una, el link se llamaría "r o a h o k i". `span` porque va
        // dentro de un link en línea; con `span`, SplitText no les da
        // `inline-block`, y sin eso `yPercent` no las mueve.
        const split = SplitText.create(
          el.querySelector("[data-logo-part=word]"),
          { type: "chars", tag: "span", charsClass: "inline-block" },
        );

        // Un trazo de largo cero con punta redonda igual pinta un punto: el
        // hombro y el ojo quedan ocultos hasta que les toca.
        gsap.set([shoulder, eye], { autoAlpha: 0 });

        intro.current = gsap
          .timeline({
            // Al terminar vuelve el texto original: partido en letras pierde
            // el kerning de la palabra.
            onComplete: () => split.revert(),
          })
          .from(head, {
            drawSVG: 0,
            duration: DURATION.long,
            ease: EASE.stroke,
          })
          .set(shoulder, { autoAlpha: 1 }, "-=0.2")
          .from(shoulder, {
            drawSVG: 0,
            duration: DURATION.short,
            ease: EASE.stroke,
          })
          .set(eye, { autoAlpha: 1 })
          .from(eye, {
            drawSVG: 0,
            duration: DURATION.base,
            ease: EASE.stroke,
          })
          .from(
            split.chars,
            {
              // `opacity` y no `autoAlpha`: una letra con `visibility: hidden`
              // sale del nombre accesible y el link queda sin nombre.
              opacity: 0,
              yPercent: 40,
              duration: DURATION.short,
              ease: EASE.enter,
              stagger: STAGGER,
            },
            DURATION.long / 2,
          );
      });
    },
    { scope: root },
  );

  const redraw = contextSafe((event: React.PointerEvent) => {
    // Solo con mouse: en una pantalla táctil el pointerenter llega con el
    // toque que ya está navegando.
    if (event.pointerType !== "mouse") return;
    if (!window.matchMedia(MOTION_OK).matches) return;
    if (!root.current || intro.current?.isActive()) return;

    gsap.fromTo(
      markPaths(root.current),
      { drawSVG: "0%" },
      {
        drawSVG: "100%",
        duration: DURATION.base,
        ease: EASE.stroke,
        stagger: STAGGER * 2,
        overwrite: true,
      },
    );
  });

  return (
    <span ref={root} data-motion="logo" onPointerEnter={redraw}>
      <Logo size={size} />
    </span>
  );
}
