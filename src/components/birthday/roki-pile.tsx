"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Attendee } from "@/lib/birthday/queries";
import { RokiFigure } from "./roki-figure";

/**
 * El montoncito: los rokis de quienes van caen y se apilan con física, y se
 * arrastran con el dedo (Figma: invitado v3, trote · montoncito).
 *
 * Cada roki es su propio SVG (`RokiFigure`, con su dibujo y su parpadeo) y la
 * física solo lo mueve: `matter.js` calcula posiciones y giros, y en cada
 * cuadro se escriben como `transform`. Así el dibujo no se re-renderiza 60
 * veces por segundo.
 *
 * `matter.js` se carga recién en el navegador y solo acá: la página es un
 * Server Component y no tiene por qué cargar un motor de física.
 *
 * Tocar un roki sin arrastrarlo lo hace saltar; si es el propio, abre la hoja
 * para redibujarlo.
 */

export type RokiPileHandle = {
  /** Sacude la pila. Solo en esta pantalla: nadie más lo ve. */
  shake: () => void;
};

const HEIGHT = 380;

export const RokiPile = forwardRef<
  RokiPileHandle,
  {
    attendees: Attendee[];
    meId: string;
    color: string;
    onTapMine: () => void;
  }
>(function RokiPile({ attendees, meId, color, onTapMine }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const shakeRef = useRef<() => void>(() => {});
  const tapMine = useRef(onTapMine);
  tapMine.current = onTapMine;

  useImperativeHandle(ref, () => ({ shake: () => shakeRef.current() }), []);

  // Más rokis, más chicos: que entren todos en la caja.
  const size = attendees.length > 12 ? 64 : attendees.length > 6 ? 76 : 92;
  const ids = attendees.map((attendee) => attendee.id).join(",");

  useEffect(() => {
    const container = box.current;
    if (!container || ids === "") return;
    let frame = 0;
    let disposed = false;
    let cleanup = () => {};

    import("matter-js").then((Matter) => {
      if (disposed) return;
      const {
        Bodies,
        Body,
        Composite,
        Engine,
        Events,
        Mouse,
        MouseConstraint,
      } = Matter;
      const width = container.clientWidth;
      const engine = Engine.create({ gravity: { y: 1.1 } });
      const wall = { isStatic: true, render: { visible: false } };
      Composite.add(engine.world, [
        Bodies.rectangle(width / 2, HEIGHT + 30, width * 3, 60, wall),
        Bodies.rectangle(-30, HEIGHT / 2, 60, HEIGHT * 4, wall),
        Bodies.rectangle(width + 30, HEIGHT / 2, 60, HEIGHT * 4, wall),
      ]);

      // Un busto: rectángulo con las esquinas de arriba redondeadas como la
      // cabeza. Caen escalonados desde arriba, el propio al final.
      const bodies = ids.split(",").map((id, index) =>
        Bodies.rectangle(
          size * 0.6 + ((index * 97) % Math.max(1, width - size * 1.2)),
          -size * (index + 1) * 0.9,
          size * 0.82,
          size * 0.92,
          {
            chamfer: { radius: [size * 0.38, size * 0.38, 6, 6] },
            restitution: 0.15,
            friction: 0.6,
            label: id,
          },
        ),
      );
      Composite.add(engine.world, bodies);

      const mouse = Mouse.create(container);
      // Matter escucha la rueda del mouse y bloquea el scroll de la página.
      const wheel = (mouse as unknown as { mousewheel: EventListener })
        .mousewheel;
      container.removeEventListener("wheel", wheel);
      container.removeEventListener("mousewheel", wheel);
      container.removeEventListener("DOMMouseScroll", wheel);
      const drag = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, damping: 0.1 },
      });
      Composite.add(engine.world, drag);

      // Un toque sin arrastre: salta, o abre la hoja si es el propio roki.
      let grabbed: {
        body: Matter.Body;
        x: number;
        y: number;
        at: number;
      } | null = null;
      Events.on(drag, "startdrag", (event) => {
        const body = (event as unknown as { body: Matter.Body }).body;
        grabbed = {
          body,
          x: mouse.position.x,
          y: mouse.position.y,
          at: performance.now(),
        };
      });
      Events.on(drag, "enddrag", () => {
        if (!grabbed) return;
        const moved = Math.hypot(
          mouse.position.x - grabbed.x,
          mouse.position.y - grabbed.y,
        );
        if (moved < 6 && performance.now() - grabbed.at < 350) {
          if (grabbed.body.label === meId) tapMine.current();
          else
            Body.setVelocity(grabbed.body, {
              x: (Math.random() - 0.5) * 4,
              y: -9,
            });
        }
        grabbed = null;
      });

      shakeRef.current = () => {
        for (const body of bodies) {
          Body.setVelocity(body, {
            x: (Math.random() - 0.5) * 22,
            y: -8 - Math.random() * 10,
          });
          Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
        }
      };

      const tick = () => {
        Engine.update(engine, 1000 / 60);
        bodies.forEach((body, index) => {
          const el = items.current[index];
          if (!el) return;
          el.style.transform = `translate(${body.position.x - size / 2}px, ${
            body.position.y - size / 2
          }px) rotate(${body.angle}rad)`;
          el.style.visibility = "visible";
        });
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      cleanup = () => {
        Mouse.clearSourceEvents(mouse);
        Composite.clear(engine.world, false);
        Engine.clear(engine);
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup();
      shakeRef.current = () => {};
    };
  }, [ids, size, meId]);

  return (
    <div
      ref={box}
      className="relative w-full touch-none overflow-hidden select-none"
      style={{ height: HEIGHT }}
    >
      {attendees.map((attendee, index) => (
        <div
          key={attendee.id}
          ref={(el) => {
            items.current[index] = el;
          }}
          className="pointer-events-none absolute top-0 left-0 flex items-end justify-center"
          // Ocultos hasta el primer cuadro de física: sin esto se verían todos
          // amontonados en la esquina mientras carga el motor.
          style={{ width: size, height: size, visibility: "hidden" }}
        >
          <RokiFigure
            roki={attendee.roki}
            color={color}
            size={size}
            label={
              attendee.id === meId ? "tu roki" : `el roki de ${attendee.name}`
            }
          />
        </div>
      ))}
    </div>
  );
});
