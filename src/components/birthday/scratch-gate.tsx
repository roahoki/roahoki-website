"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MARK_PATHS, MARK_VIEWBOX } from "@/components/brand/paths";

/**
 * La entrada a la página: la invitación tapada con un raspe de rokis (Figma:
 * "cumple v3 · raspa"). Mientras no se raspa, en pantalla está solo la tarjeta;
 * el resto de la página aparece al destaparla.
 *
 * Se raspa una sola vez: la fecha queda en la base (`scratched_at`), así que al
 * volver se entra directo. Para quien no puede arrastrar (teclado, lector de
 * pantalla) hay un botón que destapa sin raspar, visible al enfocarlo.
 */

/** Cuánto hay que raspar para dar la invitación por destapada. */
const DONE_RATIO = 0.45;

const COVER = "#BFC3BB";
const PATTERN = "rgba(98, 105, 92, 0.35)";
const INK = "#101610";

export function ScratchGate({
  token,
  scratched,
  card,
  children,
}: {
  token: string;
  scratched: boolean;
  card: ReactNode;
  children: ReactNode;
}) {
  const [revealed, setRevealed] = useState(scratched);
  const [fading, setFading] = useState(false);

  const reveal = useCallback(() => {
    if (fading) return;
    setFading(true);
    fetch("/api/birthday/scratch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => {
      // Si no se guardó, la próxima vez le toca raspar de nuevo. No es grave.
    });
    // El raspe se desvanece y recién ahí aparece el resto.
    setTimeout(() => setRevealed(true), 650);
  }, [fading, token]);

  if (revealed) return <>{children}</>;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-[420px]">
        {card}
        <ScratchCanvas onDone={reveal} fading={fading} />
        <button
          type="button"
          onClick={reveal}
          className="sr-only focus:not-sr-only focus:absolute focus:bottom-4 focus:left-1/2 focus:-translate-x-1/2 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-action focus:text-paper"
        >
          destapar la invitación
        </button>
      </div>
    </main>
  );
}

function ScratchCanvas({
  onDone,
  fading,
}: {
  onDone: () => void;
  fading: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const done = useRef(false);

  // Pinta el raspe: color liso, rokis chicos de patrón y "raspa acá".
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // `setTransform` y no `scale`: en desarrollo React corre el efecto dos
    // veces, y un `scale` acumulado dejaría el dibujo al cuadrado.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = COVER;
    ctx.fillRect(0, 0, width, height);

    const marks = MARK_PATHS.map((d) => new Path2D(d));
    const size = width / 6.5;
    const scale = size / MARK_VIEWBOX.height;
    ctx.strokeStyle = PATTERN;
    ctx.lineWidth = 32;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let row = 0; row * size * 1.05 < height + size; row++) {
      for (let col = -1; col * size * 1.1 < width + size; col++) {
        ctx.save();
        // Filas corridas, como un papel de regalo.
        ctx.translate(
          col * size * 1.1 + (row % 2) * size * 0.55,
          row * size * 1.05,
        );
        ctx.scale(scale, scale);
        ctx.translate(-MARK_VIEWBOX.x, -MARK_VIEWBOX.y);
        for (const mark of marks) ctx.stroke(mark);
        ctx.restore();
      }
    }

    const family = getComputedStyle(canvas).fontFamily;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.font = `700 ${width * 0.13}px ${family}`;
    ctx.fillText("raspa acá", width / 2, height / 2);
    ctx.font = `400 ${width * 0.045}px ${family}`;
    ctx.fillText("con el dedo :)", width / 2, height / 2 + width * 0.08);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function scratch(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = canvas.getBoundingClientRect().width * 0.14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  /** Qué parte del raspe ya se borró, mirando un píxel de cada 8. */
  function clearedRatio(): number {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 8) {
      total++;
      // Casi transparente cuenta como raspado: el borde suavizado del trazo
      // nunca llega a cero exacto.
      if (data[i] < 32) clear++;
    }
    return total ? clear / total : 0;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Raspa acá para destapar tu invitación"
      role="img"
      className="absolute inset-0 size-full touch-none rounded-2xl font-brand transition-opacity duration-[600ms]"
      style={{ opacity: fading ? 0 : 1 }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const at = point(event);
        last.current = at;
        scratch(at, { x: at.x + 0.1, y: at.y });
      }}
      onPointerMove={(event) => {
        if (!last.current) return;
        const at = point(event);
        scratch(last.current, at);
        last.current = at;
      }}
      onPointerUp={() => {
        last.current = null;
        if (!done.current && clearedRatio() >= DONE_RATIO) {
          done.current = true;
          onDone();
        }
      }}
    />
  );
}
