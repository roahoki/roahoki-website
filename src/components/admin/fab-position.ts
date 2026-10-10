/**
 * Dónde está el botón flotante del admin.
 *
 * Se mide desde la esquina de abajo a la derecha, no desde arriba a la
 * izquierda: al girar el celular o achicar la ventana el botón sigue pegado a
 * la misma esquina en vez de quedar en medio de la pantalla.
 */
export type FabPosition = { right: number; bottom: number };

export const FAB_SIZE = 52;

/** Cuánto se separa como mínimo de los bordes de la pantalla. */
const EDGE = 8;

export const DEFAULT_FAB_POSITION: FabPosition = { right: 20, bottom: 20 };

/** Menos que esto entre apretar y soltar es un toque, no un arrastre. */
export const DRAG_THRESHOLD = 6;

/** Mantiene el botón entero dentro de la pantalla. */
export function clampFabPosition(
  position: FabPosition,
  viewport: { width: number; height: number },
): FabPosition {
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(value, EDGE), Math.max(EDGE, max - FAB_SIZE - EDGE));
  return {
    right: clamp(position.right, viewport.width),
    bottom: clamp(position.bottom, viewport.height),
  };
}

/**
 * La posición después de mover el puntero `dx`, `dy` desde donde empezó el
 * arrastre. Hacia la derecha y hacia abajo el botón se acerca a su esquina.
 */
export function dragFabPosition(
  start: FabPosition,
  dx: number,
  dy: number,
  viewport: { width: number; height: number },
): FabPosition {
  return clampFabPosition(
    { right: start.right - dx, bottom: start.bottom - dy },
    viewport,
  );
}

const STORAGE_KEY = "roahoki:admin-fab";

/**
 * La posición que quedó guardada en este navegador. Es una comodidad: si el
 * almacenamiento no está disponible o tiene basura, vuelve a la esquina.
 */
export function loadFabPosition(): FabPosition {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      typeof parsed === "object" &&
      "right" in parsed &&
      "bottom" in parsed &&
      Number.isFinite(parsed.right) &&
      Number.isFinite(parsed.bottom)
    ) {
      return { right: Number(parsed.right), bottom: Number(parsed.bottom) };
    }
  } catch {
    // Navegación privada o almacenamiento bloqueado.
  }
  return DEFAULT_FAB_POSITION;
}

export function saveFabPosition(position: FabPosition) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Igual que al leer: sin almacenamiento, la posición dura hasta recargar.
  }
}
