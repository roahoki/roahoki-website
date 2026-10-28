"use client";

import { useEffect } from "react";
import { palette } from "@/lib/brand/palette";
import { MOTION_OK } from "@/lib/motion/tokens";

/**
 * Pinta toda la pantalla del color del plan que se está viendo (bloque 3 del
 * roadmap: "toda la pantalla cambia"). Reemplaza al color que nacía del dedo
 * al abrir la página de un plan, que ya no existe.
 *
 * Cada plan lleva `data-backdrop` con su color. El cambio llega apenas el plan
 * asoma por abajo (cruza una línea al 85 % de la pantalla), no al llegar a la
 * mitad: el texto de los planes es papel, y mientras el fondo seguía papel el
 * primer plan quedaba invisible y la página parecía terminar ahí. Arriba del
 * primer plan, papel.
 *
 * Con el fondo cambia también el color del texto del `body` (papel sobre un
 * plan, tinta sobre papel): el saludo, que hereda ese color, se sigue leyendo
 * cuando el plan de abajo ya pintó la pantalla. Lo que va después del último
 * plan trae su propio fondo papel, así que no necesita zona.
 *
 * Pinta el `body` y no un fondo propio para que también cambie lo que queda
 * detrás al estirar la página en iOS, y actualiza `theme-color` para que la
 * barra del navegador acompañe.
 *
 * Se monta junto con el resto de la página, después de raspar: antes no hay
 * zonas que mirar.
 */
/** Dónde está la línea que decide el color, desde arriba. */
export const BACKDROP_LINE = 0.85;

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
      color: body.style.color,
      transition: body.style.transition,
      theme: meta?.content,
    };
    if (window.matchMedia(MOTION_OK).matches) {
      body.style.transition = "background-color 450ms ease, color 450ms ease";
    }

    const paint = (color: string) => {
      body.style.backgroundColor = color;
      body.style.color = color === palette.paper ? palette.ink : palette.paper;
      if (meta) meta.content = color;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) {
          paint((hit.target as HTMLElement).dataset.backdrop ?? palette.paper);
          return;
        }
        // Arriba del primer plan no hay zona: papel. Debajo del último se
        // queda su color, detrás de la hoja papel del final.
        const line = window.innerHeight * BACKDROP_LINE;
        if (zones[0].getBoundingClientRect().top > line) paint(palette.paper);
      },
      // Una línea de alto cero al 85 % de la pantalla.
      {
        rootMargin: `-${Math.round(BACKDROP_LINE * 100)}% 0px -${Math.round((1 - BACKDROP_LINE) * 100)}% 0px`,
      },
    );
    for (const zone of zones) observer.observe(zone);

    return () => {
      observer.disconnect();
      body.style.backgroundColor = previous.background;
      body.style.color = previous.color;
      body.style.transition = previous.transition;
      if (meta && previous.theme) meta.content = previous.theme;
    };
  }, []);

  return null;
}
