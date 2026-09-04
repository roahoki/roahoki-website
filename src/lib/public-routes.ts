/**
 * El catálogo de páginas públicas estáticas del sitio.
 *
 * Existe para que `sitemap.ts` y `llms.txt` no mantengan cada uno su propia
 * lista: una ruta nueva que se agregue en un solo lado queda invisible para los
 * crawlers en el otro, y ese olvido no rompe nada que un test o el build puedan
 * detectar. Con una sola fuente, agregar una página es agregar una entrada acá.
 *
 * Solo las estáticas. Las notas del logbook salen de la base y las arma cada
 * consumidor, porque cambian sin que nadie toque el repo.
 *
 * `description` es para el `llms.txt` y no para la UI: es lo único que un
 * agente lee antes de decidir si abre la página, así que dice de qué trata en
 * concreto en vez de repetir el título.
 */
export type PublicRoute = {
  path: string;
  title: string;
  description: string;
};

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  {
    path: "/",
    title: "Sobre mí",
    description:
      "Joaquín Peralta Pérez (roahoki), ingeniero de software en Buk. Bio, stack, resumen de experiencia, proyectos destacados y testimonios.",
  },
  {
    path: "/experience",
    title: "Experiencia",
    description:
      "Historial profesional en detalle: Buk, Atipicus, Biomechanics.wav y Mesti, más la docencia en la PUC.",
  },
  {
    path: "/projects",
    title: "Proyectos",
    description:
      "Videos en YouTube enseñando estructuras de datos y arquitectura de computadores.",
  },
  {
    path: "/teaching",
    title: "Clases",
    description:
      "Clases particulares para estudiantes de ingeniería de la PUC: estructuras de datos, algoritmos, paradigmas de programación, manejo de memoria y concurrencia.",
  },
  {
    path: "/logbook",
    title: "Logbook",
    description: "Notas cortas sobre lo que voy construyendo y aprendiendo.",
  },
  {
    path: "/stats",
    title: "Stats",
    description:
      "Contadores públicos de mi entrenamiento de calistenia, actualizados durante la semana.",
  },
] as const;

/**
 * Las rutas que no entran en el catálogo, y por qué.
 *
 * `/testimonials/new` es un formulario: no tiene contenido que indexar y su
 * lugar es el link desde la landing, no un resultado de búsqueda.
 * `/admin` y `/api` quedan excluidos en `robots.ts`, que es donde corresponde.
 */
