/**
 * Los planes del cumpleaños: la **única** definición.
 *
 * Viven en código y no en la base por la misma razón que el catálogo de
 * `src/lib/stats/exercises.ts`: cambian poco, solo los edita Joaquín y una PR
 * chica basta para mover una hora. La base guarda solo lo que generan las
 * personas (respuestas, rokis, álbumes).
 *
 * Los slugs viajan a la base y a la API, así que van en inglés como el resto
 * del código. `path` es el segmento de la URL que ve el invitado
 * (`/cumple/<token>/trote`) y va en español porque es contenido.
 *
 * El orden de `BIRTHDAY_EVENTS` es cronológico y es el orden del lineup.
 *
 * Las horas llevan el offset de Santiago en noviembre (-03:00, horario de
 * verano). Escritas con offset y no como hora local, el instante es el mismo en
 * el servidor de Vercel (UTC) que en el celular del invitado.
 */

export const EVENT_SLUGS = ["cocktail", "run", "party", "hike"] as const;

export type EventSlug = (typeof EVENT_SLUGS)[number];

/** Un dato de la página del plan: "¿dónde nos juntamos?", "nivel"… */
export type EventDetail = { label: string; value: string };

export type BirthdayEvent = {
  slug: EventSlug;
  /** El segmento de la URL: `/cumple/<token>/<path>`. */
  path: string;
  /** El nombre en el lineup, en minúscula como pide el brand book. */
  title: string;
  startsAt: string;
  endsAt: string;
  /**
   * Dónde, en una línea. Nunca la dirección de la casa: esa la manda Joaquín
   * por WhatsApp y no se escribe ni en la página ni en el repo.
   */
  place: string;
  /** El color del plan (Figma: variables `cumple/*`). */
  color: string;
  /** La pregunta sobre el voy / no voy. */
  question: string;
  details: readonly EventDetail[];
  /** Si el plan viene marcado al crear un invitado nuevo. */
  invitedByDefault: boolean;
};

const AT_HOME = "en mi casa, te mando la dirección por WhatsApp";

export const BIRTHDAY_EVENTS: readonly BirthdayEvent[] = [
  {
    slug: "cocktail",
    path: "coctel",
    title: "cóctel",
    startsAt: "2026-11-04T19:00:00-03:00",
    endsAt: "2026-11-04T22:00:00-03:00",
    place: "en mi casa",
    color: "#173F2A",
    question: "¿vas?",
    details: [
      { label: "¿dónde?", value: AT_HOME },
      { label: "¿qué celebramos?", value: "mi cumple y mi titulación" },
      { label: "vestimenta", value: "formal" },
    ],
    // Joaquín elige a mano a quién invita al cóctel.
    invitedByDefault: false,
  },
  {
    slug: "run",
    path: "trote",
    title: "trote",
    startsAt: "2026-11-07T09:00:00-03:00",
    endsAt: "2026-11-07T12:30:00-03:00",
    place: "metro baquedano",
    color: "#C42B1C",
    question: "¿vas?",
    details: [
      {
        label: "¿dónde nos juntamos?",
        value: "Metro Baquedano a las 9! puntualidad",
      },
      {
        label: "¿dónde terminamos?",
        value: "Metro Pedro de Valdivia, por el San Cristóbal",
      },
      {
        label: "distancia y ritmo",
        value:
          "~10k piolita, nadie se queda atrás la idea es salir un rato a trotá",
      },
    ],
    invitedByDefault: true,
  },
  {
    slug: "party",
    path: "carrete",
    title: "carrete",
    startsAt: "2026-11-07T21:00:00-03:00",
    endsAt: "2026-11-08T05:00:00-03:00",
    place: "en mi casa",
    color: "#0E2A47",
    question: "¿vas?",
    details: [
      { label: "¿dónde?", value: AT_HOME },
      {
        label: "temática",
        value:
          "trae cualquier cosa que te sirva para tomar, excepto un vaso o tazón",
      },
    ],
    invitedByDefault: true,
  },
  {
    slug: "hike",
    path: "manquehue",
    title: "manquehue",
    startsAt: "2026-11-08T16:00:00-03:00",
    endsAt: "2026-11-08T21:00:00-03:00",
    place: "metro escuela militar",
    color: "#3F2D5C",
    question: "¿vas? daale hagamos una cumbre juntos!",
    details: [
      {
        label: "¿dónde nos juntamos?",
        value: "Metro Escuela Militar a las 16:00!",
      },
      { label: "nivel", value: "Exigente, 3 horas 30 en total" },
    ],
    invitedByDefault: true,
  },
];

const BY_SLUG = new Map(BIRTHDAY_EVENTS.map((event) => [event.slug, event]));
const BY_PATH = new Map(BIRTHDAY_EVENTS.map((event) => [event.path, event]));

/** Los planes con los que nace un invitado nuevo: todos menos el cóctel. */
export const DEFAULT_INVITED_EVENTS: readonly EventSlug[] =
  BIRTHDAY_EVENTS.filter((event) => event.invitedByDefault).map(
    (event) => event.slug,
  );

/**
 * Guarda de tipos para lo que llega de afuera. Sin esto, un slug inventado
 * llegaría hasta el `insert` y lo frenaría recién el check de la base, con un
 * error de Postgres en vez de un 400.
 */
export function isEventSlug(value: unknown): value is EventSlug {
  return typeof value === "string" && BY_SLUG.has(value as EventSlug);
}

export function eventBySlug(slug: EventSlug): BirthdayEvent {
  const event = BY_SLUG.get(slug);
  // Solo puede pasar si `EVENT_SLUGS` y `BIRTHDAY_EVENTS` quedan desalineados.
  if (!event) {
    throw new Error(`El plan "${slug}" no está en BIRTHDAY_EVENTS.`);
  }
  return event;
}

/** El plan de un segmento de URL, o `undefined` si no existe. */
export function eventByPath(path: string): BirthdayEvent | undefined {
  return BY_PATH.get(path);
}

/** Los planes de un invitado, en orden cronológico. */
export function eventsFor(invited: readonly string[]): BirthdayEvent[] {
  return BIRTHDAY_EVENTS.filter((event) => invited.includes(event.slug));
}

/**
 * Si el plan ya pasó, para mostrar "ya pasó" y el álbum.
 *
 * Cambia al **día siguiente** del término, en hora de Santiago, y no apenas
 * termina: así alguien atrasado igual puede anotarse el mismo día. El carrete
 * termina a las 05:00 del domingo y pasa recién el lunes.
 */
export function hasPassed(
  event: BirthdayEvent,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= nextSantiagoMidnight(new Date(event.endsAt));
}

/** La medianoche de Santiago siguiente a un instante, en milisegundos UTC. */
function nextSantiagoMidnight(instant: Date): number {
  // Noviembre en Santiago es -03:00 todo el mes; los planes no cruzan un
  // cambio de horario, así que el offset fijo basta.
  const OFFSET_MS = 3 * 60 * 60 * 1000;
  const local = new Date(instant.getTime() - OFFSET_MS);
  const nextLocalMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
  );
  return nextLocalMidnight + OFFSET_MS;
}

/**
 * El plan con los textos que Joaquín corrigió desde el panel, si los hay. El
 * resto (horas, color, ruta) sigue siendo el de código.
 */
export function withTexts(
  event: BirthdayEvent,
  texts: { question: string; details: readonly EventDetail[] } | undefined,
): BirthdayEvent {
  return texts
    ? { ...event, question: texts.question, details: texts.details }
    : event;
}
