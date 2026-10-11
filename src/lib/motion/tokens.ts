/**
 * El vocabulario de movimiento de roahoki: pocas curvas y duraciones, con
 * nombre, igual que la paleta. Todo gesto sale de acá, así el movimiento del
 * sitio se reconoce como uno solo y no como una colección de efectos.
 *
 * Las duraciones van en segundos porque es la unidad de GSAP.
 */
export const DURATION = {
  short: 0.4,
  base: 0.6,
  long: 0.9,
} as const;

export const EASE = {
  /** Un trazo a mano: arranca y frena suave, como la punta de un lápiz. */
  stroke: "power2.inOut",
  /** Algo que entra y se asienta. */
  enter: "power3.out",
} as const;

/** Desfase entre elementos que entran uno tras otro, como las letras. */
export const STAGGER = 0.045;

/**
 * Bajo esta media query hay movimiento. Quien pidió reducirlo ve todo en su
 * lugar desde el principio.
 */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
