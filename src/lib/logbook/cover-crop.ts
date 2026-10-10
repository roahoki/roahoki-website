import type { CSSProperties } from "react";

/**
 * El encuadre de la portada: qué parte de la foto muestra la tarjeta del home,
 * que la recorta a 2:1.
 *
 * Se guarda como un punto de la foto (`x`, `y`, fracciones de 0 a 1) y un
 * `zoom` (1 = la foto llena la tarjeta justo, sin sobrar por el lado corto). El
 * punto queda en el mismo lugar relativo de la tarjeta: con `x = 0` se ve el
 * borde izquierdo, con `0.5` el centro.
 *
 * Es exactamente lo que hace CSS con `object-fit: cover`, `object-position:
 * x y` y un `scale(zoom)` con origen en ese mismo punto. Por eso la tarjeta lo
 * dibuja con CSS (`coverCropStyle`) y el editor de encuadre usa estas mismas
 * cuentas: lo que se ve al ajustar es lo que muestra la tarjeta.
 */
export type CoverCrop = { x: number; y: number; zoom: number };

export const DEFAULT_COVER_CROP: CoverCrop = { x: 0.5, y: 0.5, zoom: 1 };

/** Más allá de esto, una foto de 2000 px ya se ve pixelada en la tarjeta. */
export const MAX_COVER_ZOOM = 4;

/** La proporción de la tarjeta: el doble de ancha que alta. */
export const CARD_ASPECT = 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function clampCrop(crop: CoverCrop): CoverCrop {
  return {
    x: clamp(crop.x, 0, 1),
    y: clamp(crop.y, 0, 1),
    zoom: clamp(crop.zoom, 1, MAX_COVER_ZOOM),
  };
}

/** Cómo dibuja la tarjeta la foto con este encuadre. */
export function coverCropStyle(crop: CoverCrop): CSSProperties {
  const origin = `${round(crop.x * 100)}% ${round(crop.y * 100)}%`;
  return {
    objectPosition: origin,
    ...(crop.zoom > 1
      ? { transform: `scale(${round(crop.zoom)})`, transformOrigin: origin }
      : {}),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Qué fracción de la foto entra en la tarjeta, a lo ancho y a lo alto.
 *
 * `aspect` es ancho / alto de la foto. Una foto más apaisada que 2:1 se recorta
 * a los costados; una más alta, arriba y abajo. El zoom achica las dos.
 */
export function visibleFraction(
  aspect: number,
  zoom: number,
): { width: number; height: number } {
  return {
    width: Math.min(1, CARD_ASPECT / aspect) / zoom,
    height: Math.min(1, aspect / CARD_ASPECT) / zoom,
  };
}

/** El rectángulo de la foto que se ve, en fracciones de la foto. */
export function cropRect(
  crop: CoverCrop,
  aspect: number,
): { left: number; top: number; width: number; height: number } {
  const { width, height } = visibleFraction(aspect, crop.zoom);
  return {
    left: crop.x * (1 - width),
    top: crop.y * (1 - height),
    width,
    height,
  };
}

/** El encuadre cuyo rectángulo empieza en `left`, `top`. */
function cropFromCorner(
  left: number,
  top: number,
  zoom: number,
  aspect: number,
): CoverCrop {
  const { width, height } = visibleFraction(aspect, zoom);
  // Si la foto entra entera en un eje no hay nada que mover en él: el punto da
  // igual y se deja al centro.
  const axis = (start: number, size: number) =>
    size >= 1 ? 0.5 : clamp(start / (1 - size), 0, 1);
  return { x: axis(left, width), y: axis(top, height), zoom };
}

/**
 * Mueve el encuadre. `dx` y `dy` son fracciones de la foto: positivos, el
 * rectángulo va hacia la derecha y hacia abajo (la foto, al revés).
 */
export function panCrop(
  crop: CoverCrop,
  aspect: number,
  dx: number,
  dy: number,
): CoverCrop {
  const rect = cropRect(crop, aspect);
  return cropFromCorner(rect.left + dx, rect.top + dy, crop.zoom, aspect);
}

/**
 * Cambia el zoom dejando quieto el punto de la foto que está en `anchor` (una
 * posición dentro de la tarjeta, de 0 a 1): bajo los dedos al pellizcar, bajo
 * el cursor con la rueda, el centro con el slider.
 */
export function zoomCrop(
  crop: CoverCrop,
  aspect: number,
  zoom: number,
  anchor: { x: number; y: number } = { x: 0.5, y: 0.5 },
): CoverCrop {
  const next = clamp(zoom, 1, MAX_COVER_ZOOM);
  const rect = cropRect(crop, aspect);
  const pointX = rect.left + anchor.x * rect.width;
  const pointY = rect.top + anchor.y * rect.height;
  const size = visibleFraction(aspect, next);
  return cropFromCorner(
    pointX - anchor.x * size.width,
    pointY - anchor.y * size.height,
    next,
    aspect,
  );
}
