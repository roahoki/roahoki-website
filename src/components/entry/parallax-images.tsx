"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { EASE, MOTION_OK, PARALLAX_DRIFT } from "@/lib/motion/tokens";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * El cuerpo de la nota, con las imágenes un poco más lentas que el texto
 * mientras cruzan la pantalla: quedan como detrás de la hoja, y el texto pasa
 * por encima.
 *
 * Recibe el markdown ya renderizado en el servidor: solo el contenedor baja al
 * cliente.
 *
 * Con movimiento reducido o sin JS, las imágenes van quietas con el texto.
 */
export function ParallaxImages({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const el = root.current;
        if (!el) return;

        const images = Array.from(el.querySelectorAll("img"));
        for (const img of images) {
          gsap.fromTo(
            img,
            { y: -PARALLAX_DRIFT },
            {
              y: PARALLAX_DRIFT,
              ease: EASE.scroll,
              scrollTrigger: {
                // El párrafo que la envuelve y no la imagen: la imagen es la
                // que se mueve, y el tramo se mediría con ella ya corrida.
                trigger: img.parentElement ?? img,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }

        // Las imágenes cargan perezosas y sin alto declarado: al llegar
        // empujan todo lo de abajo, y los tramos medidos antes quedan
        // corridos.
        const pending = images.filter((img) => !img.complete);
        const refresh = () => ScrollTrigger.refresh();
        for (const img of pending) {
          img.addEventListener("load", refresh, { once: true });
        }
        return () => {
          for (const img of pending) img.removeEventListener("load", refresh);
        };
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
