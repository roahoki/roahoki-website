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
  /** Lo que va pegado al scroll: lineal, o se despega de la mano que scrollea. */
  scroll: "none",
} as const;

/** Desfase entre elementos que entran uno tras otro, como las letras. */
export const STAGGER = 0.045;

/**
 * Bajo esta media query hay movimiento. Quien pidió reducirlo ve todo en su
 * lugar desde el principio.
 */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** Cuánto sube algo que entra, en px, antes de asentarse en su lugar. */
export const ENTER_OFFSET = 24;

/**
 * Cuánto se corre una imagen del cuerpo respecto del texto mientras cruza la
 * pantalla, en px, hacia cada lado. Menos que el margen que la separa del
 * texto (32 px): nunca llega a tocarlo.
 */
export const PARALLAX_DRIFT = 24;

/**
 * Lo que se anima al cargar arranca invisible desde el CSS
 * (`[data-motion]` en `globals.css`), con un respaldo que lo muestra a los 3 s
 * por si el JS no llega. Si la página lleva más que esto cargando, el
 * respaldo ya lo mostró (o está por hacerlo): animarlo sería borrarlo para
 * volver a mostrarlo, así que se deja quieto. Un poco antes de los 3 s para
 * no arrancar justo cuando aparece.
 *
 * También vale tras una navegación del cliente: `performance.now()` cuenta
 * desde la carga de la página, así que volver al home no repite la entrada.
 */
export const REVEAL_DEADLINE_MS = 2800;
