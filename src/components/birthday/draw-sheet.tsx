"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Eraser, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MARK_PATHS, MARK_VIEWBOX } from "@/components/brand/paths";
import { canAddStroke, detectEye, simplify } from "@/lib/birthday/drawing";
import {
  ROKI_COLORS,
  type Roki,
  type RokiColor,
  type RokiPoint,
  type RokiStroke,
} from "@/lib/birthday/roki";

/**
 * La hoja para dibujar el roki (Figma: invitado v3, "dibuja tu roki (un
 * paso)"). Sube sobre el color del plan la primera vez que alguien dice voy, o
 * cuando toca su propio roki para redibujarlo.
 *
 * El calco es roki en gris. Al redibujar se puede cambiar por el dibujo
 * anterior, o sacarlo para dibujar a mano alzada: quien redibuja a veces quiere
 * partir de su versión y a veces volver a la forma de roki. Mientras se
 * dibuja se busca el ojo (`detectEye`) y, si aparece, se avisa: así se aprende
 * que un ojo cerrado hace que el roki parpadee, sin tener que explicarlo antes.
 */

const CALCO = "#BFC3BB";

/** Qué queda de calco bajo el lienzo. */
type Guide = "roki" | "previous" | "none";

const GUIDES: { value: Guide; label: string }[] = [
  { value: "roki", label: "roki" },
  { value: "previous", label: "tu dibujo" },
  { value: "none", label: "nada" },
];
/** Grosor del trazo como fracción del lienzo; el mismo que usa `RokiFigure`. */
const STROKE = 0.034;

export function DrawSheet({
  open,
  onOpenChange,
  token,
  planTitle,
  planColor,
  previous,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  planTitle: string;
  planColor: string;
  /** El roki actual, que queda de calco al redibujar. */
  previous: Roki | null;
  onSaved: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<RokiStroke[]>([]);
  const [color, setColor] = useState<RokiColor>(ROKI_COLORS[0]);
  const [guide, setGuide] = useState<Guide>("roki");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<RokiPoint[] | null>(null);
  const eye = detectEye(strokes);

  const paint = useCallback(
    (live: RokiPoint[] | null = null) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const size = canvas.getBoundingClientRect().width;
      if (canvas.width !== Math.round(size * dpr)) {
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // El calco.
      ctx.strokeStyle = CALCO;
      ctx.lineWidth = size * STROKE * 0.8;
      if (guide === "previous" && previous) {
        for (const stroke of previous.strokes) line(ctx, stroke.points, size);
      } else if (guide !== "none") {
        const scale = (size * 0.8) / MARK_VIEWBOX.height;
        ctx.save();
        ctx.translate(size * 0.12, size * 0.12);
        ctx.scale(scale, scale);
        ctx.translate(-MARK_VIEWBOX.x, -MARK_VIEWBOX.y);
        ctx.lineWidth = (size * STROKE * 0.8) / scale;
        for (const d of MARK_PATHS) ctx.stroke(new Path2D(d));
        ctx.restore();
      }

      // Lo dibujado.
      ctx.lineWidth = size * STROKE;
      for (const stroke of strokes) {
        ctx.strokeStyle = stroke.color;
        line(ctx, stroke.points, size);
      }
      if (live) {
        ctx.strokeStyle = color;
        line(ctx, live, size);
      }
    },
    [strokes, previous, color, guide],
  );

  useEffect(() => {
    if (!open) return;
    // Espera al montaje del lienzo dentro del diálogo.
    const id = requestAnimationFrame(() => paint());
    return () => cancelAnimationFrame(id);
  }, [open, paint]);

  function point(event: React.PointerEvent<HTMLCanvasElement>): RokiPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    ];
  }

  async function save() {
    setBusy(true);
    setError(null);
    const roki: Roki = { strokes, eye };
    try {
      const res = await fetch("/api/birthday/roki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, roki }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error);
      }
      setStrokes([]);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "No se guardó tu roki, inténtalo otra vez.",
      );
    } finally {
      setBusy(false);
    }
  }

  const action =
    "inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-4 text-action text-ink disabled:opacity-40";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ backgroundColor: planColor }}
        />
        <Dialog.Content
          aria-describedby="dibuja-ayuda"
          className="fixed inset-x-0 top-0 bottom-0 z-50 mx-auto flex max-w-[480px] flex-col"
        >
          <p className="px-4 pt-5 pb-4 text-card-title-sm text-paper">
            {planTitle}
          </p>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-paper px-4 pt-6 pb-8 text-ink">
            <p className="text-entry-meta text-faded">para entrar a la pila</p>
            <Dialog.Title className="text-entry-title">
              {previous ? "redibuja tu roki" : "dibuja tu roki"}
            </Dialog.Title>
            <p id="dibuja-ayuda" className="text-body">
              Cabeza, hombros y el ojo. Puedes seguir el calco o hacerlo a tu
              manera.
            </p>

            <fieldset className="flex items-center gap-2">
              <legend className="sr-only">calco</legend>
              <span className="text-card-meta text-faded" aria-hidden>
                calco
              </span>
              {GUIDES.filter(
                (option) => option.value !== "previous" || previous,
              ).map((option) => (
                <label
                  key={option.value}
                  className="cursor-pointer rounded-full border-[1.5px] border-ink px-3 py-1 text-card-meta has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2"
                >
                  <input
                    type="radio"
                    name="calco"
                    className="sr-only"
                    checked={guide === option.value}
                    onChange={() => setGuide(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            {/* `shrink-0`: en una pantalla baja el flex lo aplastaba y el lienzo,
                que se pinta cuadrado, se veía estirado. */}
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border-[1.5px] border-ink">
              <canvas
                ref={canvasRef}
                aria-label="lienzo para dibujar tu roki"
                className="size-full touch-none"
                onPointerDown={(event) => {
                  if (!canAddStroke(strokes)) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  current.current = [point(event)];
                  paint(current.current);
                }}
                onPointerMove={(event) => {
                  if (!current.current) return;
                  current.current.push(point(event));
                  paint(current.current);
                }}
                onPointerUp={() => {
                  const points = current.current;
                  current.current = null;
                  if (!points) return;
                  setStrokes((prev) => [
                    ...prev,
                    { color, points: simplify(points) },
                  ]);
                }}
              />
              {eye !== null && (
                <p className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-leaf bg-paper px-3 py-1.5 text-card-meta text-leaf">
                  <Check className="size-4" aria-hidden />
                  ojo encontrado: va a parpadear :)
                </p>
              )}
            </div>

            <fieldset className="flex gap-2.5">
              <legend className="sr-only">color del lápiz</legend>
              {ROKI_COLORS.map((swatch) => (
                <label
                  key={swatch}
                  className="size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-paper has-[:checked]:ring-2 has-[:checked]:ring-ink has-[:focus-visible]:outline-2"
                  style={{ backgroundColor: swatch }}
                >
                  <input
                    type="radio"
                    name="color"
                    className="sr-only"
                    checked={color === swatch}
                    onChange={() => setColor(swatch)}
                    aria-label={`color ${swatch}`}
                  />
                </label>
              ))}
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={action}
                disabled={strokes.length === 0}
                onClick={() => setStrokes((prev) => prev.slice(0, -1))}
              >
                <Undo2 className="size-[18px]" aria-hidden />
                deshacer
              </button>
              <button
                type="button"
                className={action}
                disabled={strokes.length === 0}
                onClick={() => setStrokes([])}
              >
                <Eraser className="size-[18px]" aria-hidden />
                borrar
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-action text-paper disabled:opacity-40"
                disabled={strokes.length === 0 || busy}
                onClick={save}
              >
                <Check className="size-[18px]" aria-hidden />
                {busy ? "guardando…" : "listo"}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-entry-meta text-leaf">
                {error}
              </p>
            )}
            <Dialog.Close className="self-start text-entry-meta text-faded underline underline-offset-4">
              {previous ? "dejarlo como está" : "dibújalo después"}
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function line(
  ctx: CanvasRenderingContext2D,
  points: RokiPoint[],
  size: number,
) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0] * size, points[0][1] * size);
  // Un toque sin arrastrar también deja un punto.
  if (points.length === 1)
    ctx.lineTo(points[0][0] * size + 0.1, points[0][1] * size);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x * size, y * size);
  ctx.stroke();
}
