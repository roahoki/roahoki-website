"use client";

import { useEffect } from "react";
import { palette } from "@/lib/brand/palette";
import { MOTION_OK } from "@/lib/motion/tokens";

/**
 * Pinta toda la pantalla del color del plan que se está viendo (bloque 3 del
 * roadmap: "toda la pantalla cambia"). Reemplaza al color que nacía del dedo
 * al abrir la página de un plan, que ya no existe.
 *
 * Cada zona de la página lleva `data-backdrop` con su color. Manda la que cruza
 * la mitad de la pantalla: así el cambio llega cuando el plan ya ocupa medio
 * celular, y no apenas asoma su borde. Arriba de la primera zona (la
 * invitación) y al final, papel.
 *
 * Pinta el `body` y no un fondo propio para que también cambie lo que queda
 * detrás al estirar la página en iOS, y actualiza `theme-color` para que la
 * barra del navegador acompañe.
 *
 * Se monta junto con el resto de la página, después de raspar: antes no hay
 * zonas que mirar.
 */
export function ScrollBackdrop() {
  useEffect(() => {
    const zones = Array.from(
      document.querySelectorAll<HTMLElement>("[data-backdrop]"),
    );
    if (zones.length === 0) return;

    const body = document.body;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const previous = {
      background: body.style.backgroundColor,
      transition: body.style.transition,
      theme: meta?.content,
    };
    if (window.matchMedia(MOTION_OK).matches) {
      body.style.transition = "background-color 450ms ease";
    }

    const paint = (color: string) => {
      body.style.backgroundColor = color;
      if (meta) meta.content = color;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) {
          paint((hit.target as HTMLElement).dataset.backdrop ?? palette.paper);
          return;
        }
        // Entre la invitación y el primer plan no hay zona: papel.
        if (zones[0].getBoundingClientRect().top > window.innerHeight / 2) {
          paint(palette.paper);
        }
      },
      // Una línea de alto cero en la mitad de la pantalla.
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const zone of zones) observer.observe(zone);

    return () => {
      observer.disconnect();
      body.style.backgroundColor = previous.background;
      body.style.transition = previous.transition;
      if (meta && previous.theme) meta.content = previous.theme;
    };
  }, []);

  return null;
}
