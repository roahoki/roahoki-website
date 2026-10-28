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
 *
 * El dedo se maneja acá y no con los eventos de `Mouse` de matter.js: esos
 * cancelan todo toque sobre la caja y la página no se podía mover con el dedo
 * encima de la pila. Ahora solo cada roki lleva `touch-action: none`; un toque
 * en el espacio vacío hace scroll como en cualquier parte.
 */

export type RokiPileHandle = {
  /** Sacude la pila. Solo en esta pantalla: nadie más lo ve. */
  shake: () => void;
};

export const RokiPile = forwardRef<
  RokiPileHandle,
  {
    attendees: Attendee[];
    meId: string;
    color: string;
    /** Alto de la caja: lo fija `WhoIsGoing` para que no cambie entre vistas. */
    height: number;
    onTapMine: () => void;
  }
>(function RokiPile({ attendees, meId, color, height, onTapMine }, ref) {
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

    // Con varios planes en la misma página, cada pila arranca recién cuando
    // aparece en pantalla (los rokis caen cuando llegas) y se pausa al salir.
    let visible = false;
    let started = false;
    let resume = () => {};

    const start = () =>
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
          Bodies.rectangle(width / 2, height + 30, width * 3, 60, wall),
          Bodies.rectangle(-30, height / 2, 60, height * 4, wall),
          Bodies.rectangle(width + 30, height / 2, 60, height * 4, wall),
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

        // Sobre un elemento suelto, fuera de la página: `Mouse` engancha sus
        // listeners táctiles al elemento que recibe y no hay forma de sacarlos.
        // La posición y el botón los escriben los eventos de puntero de abajo.
        const mouse = Mouse.create(document.createElement("div"));
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
          if (!visible) {
            frame = 0;
            return;
          }
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
        resume = () => {
          if (frame === 0) frame = requestAnimationFrame(tick);
        };
        resume();

        const at = (event: PointerEvent) => {
          const rect = container.getBoundingClientRect();
          const point = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          mouse.position.x = mouse.absolute.x = point.x;
          mouse.position.y = mouse.absolute.y = point.y;
          return point;
        };
        let pointer: number | null = null;
        const down = (event: PointerEvent) => {
          // Solo un toque sobre un roki lo agarra; el resto es scroll.
          if (
            pointer !== null ||
            !(event.target as Element).closest("[data-roki]")
          )
            return;
          pointer = event.pointerId;
          container.setPointerCapture(event.pointerId);
          const point = at(event);
          mouse.mousedownPosition.x = point.x;
          mouse.mousedownPosition.y = point.y;
          mouse.button = 0;
        };
        const move = (event: PointerEvent) => {
          if (event.pointerId === pointer) at(event);
        };
        const up = (event: PointerEvent) => {
          if (event.pointerId !== pointer) return;
          at(event);
          pointer = null;
          mouse.button = -1;
        };
        container.addEventListener("pointerdown", down);
        container.addEventListener("pointermove", move);
        container.addEventListener("pointerup", up);
        container.addEventListener("pointercancel", up);

        cleanup = () => {
          container.removeEventListener("pointerdown", down);
          container.removeEventListener("pointermove", move);
          container.removeEventListener("pointerup", up);
          container.removeEventListener("pointercancel", up);
          Composite.clear(engine.world, false);
          Engine.clear(engine);
        };
      });

    const onVisible = (now: boolean) => {
      visible = now;
      if (!now) return;
      if (!started) {
        started = true;
        start();
      } else resume();
    };
    // Sin IntersectionObserver (navegadores muy viejos), arranca de una.
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) =>
            onVisible(entry.isIntersecting),
          );
    if (observer) observer.observe(container);
    else onVisible(true);

    return () => {
      disposed = true;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      cleanup();
      shakeRef.current = () => {};
    };
  }, [ids, size, meId, height]);

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden select-none"
      style={{ height }}
    >
      {attendees.map((attendee, index) => (
        <div
          key={attendee.id}
          ref={(el) => {
            items.current[index] = el;
          }}
          data-roki
          className="absolute top-0 left-0 flex touch-none items-end justify-center"
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
