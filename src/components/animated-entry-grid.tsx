"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import {
  DURATION,
  EASE,
  ENTER_OFFSET,
  MOTION_OK,
  REVEAL_DEADLINE_MS,
  STAGGER,
} from "@/lib/motion/tokens";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Desfase entre tarjetas: más que entre letras, porque cada una es más grande. */
const CARD_STAGGER = STAGGER * 2;

/** Las tarjetas esperan un poco para que el logo empiece a dibujarse primero. */
const FIRST_ENTER_DELAY = 0.2;

/**
 * La grilla del home. Las tarjetas que se ven al cargar entran escalonadas;
 * las de más abajo, a medida que el scroll llega a ellas. En las portadas
 * tipográficas el número cuenta desde cero mientras la tarjeta sube.
 *
 * Recibe los `<li data-motion="card">` ya renderizados en el servidor: solo la
 * lista baja al cliente, las tarjetas siguen siendo Server Components.
 *
 * Con movimiento reducido o sin JS, las tarjetas están quietas y enteras. Al
 * volver al home navegando, las que se ven no repiten la entrada (ver
 * `REVEAL_DEADLINE_MS`).
 */
export function AnimatedEntryGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // El `contextSafe` de este contexto y no el de `useGSAP`: `enter` se
      // llama también acá mismo, y uno de afuera metería a este contexto
      // dentro de sí mismo (GSAP se va en una recursión infinita).
      mm.add(MOTION_OK, (_context, contextSafe) => {
        const el = root.current;
        if (!el || !contextSafe) return;

        const cards = Array.from(
          el.querySelectorAll<HTMLElement>("[data-motion=card]"),
        );
        gsap.set(cards, { visibility: "visible" });

        const late = performance.now() > REVEAL_DEADLINE_MS;
        const inView = cards.filter(
          (card) => card.getBoundingClientRect().top < window.innerHeight,
        );
        const below = cards.filter((card) => !inView.includes(card));
        // Tarde, lo que ya se ve se queda quieto: el respaldo del CSS ya lo
        // mostró. Lo de más abajo nadie lo vio todavía y puede entrar.
        const animated = late ? below : cards;

        const counters = animated.flatMap(countersOf);
        gsap.set(animated, { opacity: 0, y: ENTER_OFFSET });
        for (const counter of counters) setCount(counter, 0);

        const enter = contextSafe((batch: Element[], delay = 0) => {
          const tl = gsap.timeline({ delay });
          tl.to(batch, {
            opacity: 1,
            y: 0,
            duration: DURATION.base,
            ease: EASE.enter,
            stagger: CARD_STAGGER,
          });
          batch.forEach((card, i) => {
            for (const counter of countersOf(card)) {
              tl.add(countUp(counter), i * CARD_STAGGER);
            }
          });
        });

        if (!late && inView.length > 0) enter(inView, FIRST_ENTER_DELAY);
        if (below.length > 0) {
          ScrollTrigger.batch(below, {
            start: "top 90%",
            once: true,
            onEnter: (batch) => enter(batch),
          });
        }

        // Si se revierte a mitad de camino (se desmonta, o el visitante pide
        // reducir el movimiento), los números vuelven a su valor real.
        return () => {
          for (const counter of counters) restoreCount(counter);
        };
      });
    },
    { scope: root },
  );

  return (
    <ul ref={root} className={className}>
      {children}
    </ul>
  );
}

function countersOf(card: Element) {
  return Array.from(card.querySelectorAll<HTMLElement>("[data-motion=count]"));
}

/** El número real de cada contador: mientras cuenta, el texto es otro. */
const finalCounts = new WeakMap<HTMLElement, string>();

function setCount(counter: HTMLElement, value: number) {
  if (!finalCounts.has(counter)) {
    finalCounts.set(counter, counter.textContent ?? "");
  }
  counter.textContent = String(value);
}

function restoreCount(counter: HTMLElement) {
  const final = finalCounts.get(counter);
  if (final !== undefined) counter.textContent = final;
}

function countUp(counter: HTMLElement) {
  const state = { value: 0 };
  return gsap.to(state, {
    value: Number(finalCounts.get(counter)),
    duration: DURATION.long,
    ease: EASE.enter,
    snap: { value: 1 },
    onUpdate: () => setCount(counter, state.value),
  });
}
