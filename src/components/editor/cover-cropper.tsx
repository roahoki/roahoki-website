"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EntryCard, type EntryCardData } from "@/components/entry-card";
import {
  type CoverCrop,
  cropRect,
  DEFAULT_COVER_CROP,
  MAX_COVER_ZOOM,
  panCrop,
  visibleFraction,
  zoomCrop,
} from "@/lib/logbook/cover-crop";

type Props = {
  url: string;
  initial: CoverCrop;
  /** La nota, para mostrar la tarjeta tal como va a quedar en el home. */
  preview: Omit<
    EntryCardData,
    "coverImageUrl" | "coverCropX" | "coverCropY" | "coverZoom"
  >;
  onDone: (crop: CoverCrop) => void;
  onCancel: () => void;
};

type Point = { x: number; y: number };
type Frame = { x: number; y: number; width: number; height: number };

/** Dónde cae un punto de la pantalla dentro del marco, de 0 a 1. */
function anchorAt(
  point: Point | MouseEvent,
  node: HTMLElement,
  frame: Frame,
): Point {
  const box = node.getBoundingClientRect();
  const x = "clientX" in point ? point.clientX : point.x;
  const y = "clientY" in point ? point.clientY : point.y;
  const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
  return {
    x: clamp((x - box.left - frame.x) / frame.width),
    y: clamp((y - box.top - frame.y) / frame.height),
  };
}

/** El espacio bajo el marco para la ayuda, y el margen a los lados. */
const HINT_SPACE = 40;
const GUTTER = 16;

/**
 * Ajustar qué parte de la foto muestra la tarjeta del home.
 *
 * La foto se ve entera detrás de un marco 2:1 fijo; lo que queda fuera del
 * marco se oscurece, para ver qué se pierde. Un dedo (o el mouse) la mueve, dos
 * dedos la acercan, y en el PC también la rueda o el slider. Al lado, la
 * tarjeta real cambia en vivo.
 *
 * En el celular ocupa la pantalla entera y no tiene slider: el pellizco basta.
 * En el PC es un diálogo sobre el editor.
 */
export function CoverCropper({
  url,
  initial,
  preview,
  onDone,
  onCancel,
}: Props) {
  const titleId = useId();
  const [crop, setCrop] = useState(initial);
  const [aspect, setAspect] = useState<number | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const stageRef = useRef<HTMLDivElement>(null);

  // El marco: lo más grande que entre en el escenario, centrado.
  const frameWidth = Math.max(
    0,
    Math.min(
      stage.width - 2 * GUTTER,
      (stage.height - HINT_SPACE - 2 * GUTTER) * 2,
    ),
  );
  const frame = {
    width: frameWidth,
    height: frameWidth / 2,
    x: (stage.width - frameWidth) / 2,
    y: (stage.height - HINT_SPACE - frameWidth / 2) / 2,
  };

  // La foto, del tamaño en que el rectángulo del encuadre calza con el marco.
  const photo = (() => {
    if (!aspect) return null;
    const rect = cropRect(crop, aspect);
    const width = frame.width / rect.width;
    const height = frame.height / rect.height;
    return {
      width,
      height,
      x: frame.x - rect.left * width,
      y: frame.y - rect.top * height,
    };
  })();

  // Los gestos usan refs y no estado: cambian a cada movimiento del puntero y
  // lo único que tiene que redibujar es el encuadre.
  const latest = useRef({ crop, aspect, frame });
  latest.current = { crop, aspect, frame };
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ crop: CoverCrop; points: Point[] } | null>(null);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () =>
      setStage({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Al abrir, el foco va al escenario (las flechas mueven la foto); al cerrar,
  // vuelve al botón que lo abrió.
  useEffect(() => {
    const previous = document.activeElement;
    stageRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  // Esc cancela el ajuste y nada más. Se escucha en captura para llegar antes
  // que el editor, que con Esc cerraría también el panel de datos.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel]);

  // La rueda acerca sobre el cursor. Un pellizco en el trackpad llega como
  // rueda con Ctrl, así que también funciona. Tiene que ser un listener no
  // pasivo para que la página no se desplace.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    function onWheel(e: WheelEvent) {
      const { crop: current, aspect: ratio, frame: f } = latest.current;
      if (!ratio || !node || f.width === 0) return;
      e.preventDefault();
      // El pellizco manda pasos mucho más chicos que la rueda del mouse.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
      setCrop(
        zoomCrop(current, ratio, current.zoom * factor, anchorAt(e, node, f)),
      );
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  // Cada vez que se apoya o se levanta un dedo, el gesto vuelve a empezar desde
  // el encuadre actual: pasar de uno a dos dedos no hace saltar la foto.
  function restartGesture() {
    gesture.current =
      pointers.current.size > 0
        ? { crop: latest.current.crop, points: [...pointers.current.values()] }
        : null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    restartGesture();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const start = gesture.current;
    const { aspect: ratio, frame: f } = latest.current;
    if (!start || !ratio || f.width === 0) return;
    const now = [...pointers.current.values()];

    // Cuánto mide la foto en pantalla con un zoom dado: para pasar píxeles a
    // fracciones de la foto.
    const scale = (zoom: number) => {
      const size = visibleFraction(ratio, zoom);
      return { x: f.width / size.width, y: f.height / size.height };
    };

    if (now.length === 1 || start.points.length === 1) {
      // Un dedo: la foto sigue al dedo, así que el encuadre va al revés.
      const px = scale(start.crop.zoom);
      setCrop(
        panCrop(
          start.crop,
          ratio,
          -(now[0].x - start.points[0].x) / px.x,
          -(now[0].y - start.points[0].y) / px.y,
        ),
      );
      return;
    }

    // Dos dedos: acercar según cuánto se separaron, sobre el punto medio, y
    // seguir el punto medio si se desplaza.
    const [a0, b0] = start.points;
    const [a1, b1] = now;
    const startDistance = Math.hypot(b0.x - a0.x, b0.y - a0.y);
    if (startDistance === 0 || !stageRef.current) return;
    const distance = Math.hypot(b1.x - a1.x, b1.y - a1.y);
    const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
    const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
    const zoomed = zoomCrop(
      start.crop,
      ratio,
      start.crop.zoom * (distance / startDistance),
      anchorAt(mid0, stageRef.current, f),
    );
    const px = scale(zoomed.zoom);
    setCrop(
      panCrop(
        zoomed,
        ratio,
        -(mid1.x - mid0.x) / px.x,
        -(mid1.y - mid0.y) / px.y,
      ),
    );
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    restartGesture();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!aspect) return;
    const step = 0.02;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (e.key in moves) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setCrop(panCrop(crop, aspect, dx, dy));
    } else if (e.key === "+" || e.key === "=") {
      setCrop(zoomCrop(crop, aspect, crop.zoom * 1.1));
    } else if (e.key === "-") {
      setCrop(zoomCrop(crop, aspect, crop.zoom / 1.1));
    }
  }

  const thirds = [1 / 3, 2 / 3];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex bg-paper md:items-center md:justify-center md:bg-ink/40 md:p-8"
    >
      <div className="flex h-full w-full flex-col md:h-auto md:max-w-[980px] md:gap-5 md:rounded-xl md:bg-paper md:p-7">
        <header className="flex h-14 shrink-0 items-center justify-between px-4 md:h-auto md:px-0">
          <button
            type="button"
            onClick={onCancel}
            className="text-action text-faded hover:text-ink md:hidden"
          >
            cancelar
          </button>
          <h2 id={titleId} className="text-action text-ink md:text-card-title">
            ajustar portada
          </h2>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onCancel}
              className="hidden text-action text-faded hover:text-ink md:inline"
            >
              cancelar · Esc
            </button>
            <button
              type="button"
              onClick={() => onDone(crop)}
              className="text-action text-leaf md:rounded-full md:border md:border-ink md:px-4 md:py-2 md:text-ink md:hover:bg-ink md:hover:text-paper"
            >
              listo
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-8">
          <div
            ref={stageRef}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: la foto se mueve con las flechas
            tabIndex={0}
            role="application"
            aria-label="encuadre de la portada: flechas para mover, + y − para acercar"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
            className="relative h-[46dvh] shrink-0 cursor-grab touch-none overflow-hidden bg-ink select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf active:cursor-grabbing md:h-[420px] md:flex-1 md:rounded-lg"
          >
            {/* biome-ignore lint/performance/noImgElement: se posiciona a mano y se mide su proporción */}
            <img
              src={url}
              alt=""
              draggable={false}
              onLoad={(e) =>
                setAspect(
                  e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
                )
              }
              className="absolute max-w-none"
              style={
                photo
                  ? {
                      left: photo.x,
                      top: photo.y,
                      width: photo.width,
                      height: photo.height,
                    }
                  : { visibility: "hidden" }
              }
            />
            {/* El marco: la sombra enorme es el velo sobre todo lo de afuera. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-md border-2 border-paper"
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
                boxShadow:
                  "0 0 0 9999px color-mix(in srgb, var(--ink) 55%, transparent)",
              }}
            >
              {thirds.map((t) => (
                <span key={`v${t}`}>
                  <span
                    className="absolute inset-y-0 w-px bg-paper/70 shadow-[0_0_1px_rgb(16_22_16/0.7)]"
                    style={{ left: `${t * 100}%` }}
                  />
                  <span
                    className="absolute inset-x-0 h-px bg-paper/70 shadow-[0_0_1px_rgb(16_22_16/0.7)]"
                    style={{ top: `${t * 100}%` }}
                  />
                </span>
              ))}
            </div>
            <p
              className="pointer-events-none absolute inset-x-0 text-center text-card-meta text-paper/80"
              style={{ top: frame.y + frame.height + 14 }}
            >
              <span className="md:hidden">
                arrastra para mover · pellizca para acercar
              </span>
              <span className="hidden md:inline">
                arrastra para mover · rueda o pellizco del trackpad para acercar
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto px-4 py-5 md:w-[325px] md:shrink-0 md:p-0">
            <label className="hidden flex-col gap-2 md:flex">
              <span className="flex justify-between text-card-meta">
                <span className="text-ink">zoom</span>
                <span className="text-faded">
                  {crop.zoom.toFixed(1).replace(".", ",")}×
                </span>
              </span>
              <input
                type="range"
                min={1}
                max={MAX_COVER_ZOOM}
                step={0.01}
                value={crop.zoom}
                onChange={(e) =>
                  aspect &&
                  setCrop(zoomCrop(crop, aspect, Number(e.target.value)))
                }
                className="accent-leaf"
              />
            </label>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between text-card-meta">
                <span className="text-ink">así se ve en el home</span>
                <button
                  type="button"
                  onClick={() => setCrop(DEFAULT_COVER_CROP)}
                  className="text-leaf underline-offset-4 hover:underline"
                >
                  volver al centro
                </button>
              </div>
              {/* La tarjeta de verdad, para que no haya diferencia con el
                  home. `inert`: tocarla no tiene que navegar a la nota. */}
              <div inert>
                <EntryCard
                  entry={{
                    ...preview,
                    coverImageUrl: url,
                    coverCropX: crop.x,
                    coverCropY: crop.y,
                    coverZoom: crop.zoom,
                  }}
                />
              </div>
            </div>

            <p className="hidden text-card-meta text-faded md:block">
              Es la tarjeta a su tamaño real en el home. La foto entera se sigue
              guardando: cambiar el encuadre no la recorta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
