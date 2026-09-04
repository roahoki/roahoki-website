/**
 * Los datos de identidad que consume el `llms.txt`.
 *
 * Son la respuesta a "¿quién es esta persona?" en el formato que le sirve a un
 * agente: prosa corta y links absolutos, no JSX. La landing cuenta lo mismo
 * pero maquetado, y separarlo evita tener que raspar componentes de React para
 * armar un archivo de texto.
 *
 * TODO: `GITHUB_URL`, `LINKEDIN_URL` y `WHATSAPP_URL` también viven, sueltas,
 * en `(site)/page.tsx`, `components/navbar.tsx` y `components/teaching-content.tsx`.
 * Unificarlas contra este módulo es un `chore/` aparte: es un cambio mecánico
 * en tres archivos de UI que no tiene que ver con la crawlability.
 */

export const FULL_NAME = "Joaquín Peralta Pérez";
export const HANDLE = "roahoki";

export const GITHUB_URL = "https://github.com/roahoki";
export const LINKEDIN_URL =
  "https://www.linkedin.com/in/joaquin-peralta-perez/";
export const WHATSAPP_URL = "https://wa.link/ht8ioc";

/** El blurb del `llms.txt`. Una frase: es lo primero y a veces lo único. */
export const SUMMARY =
  "Ingeniero de software chileno, actualmente en Buk. Trabaja el stack completo y enseña programación en la PUC hace más de cuatro años.";

/** El párrafo de contexto, para el agente que sí sigue leyendo. */
export const BIO = [
  `${FULL_NAME} (${HANDLE}) es Ingeniero de Software en Buk, donde trabaja en el equipo de Cultura refactorizando y unificando el módulo de encuestas laborales con Ruby on Rails.`,
  "Antes fue Software Engineer Trainee en Atipicus construyendo un sistema de agentes de IA para el sector salud sobre Google Cloud, desarrollador fullstack del sitio de Biomechanics.wav, y Líder Técnico Mobile en Mesti.",
  "En la Pontificia Universidad Católica de Chile fue Coordinador General del curso Arquitectura de Computadores y ayudante de Estructuras de Datos y Programación Avanzada. Da clases particulares a estudiantes de ingeniería.",
  "Está abierto a roles de SWE, trabajo freelance y clases particulares.",
];

export const STACK = [
  "TypeScript",
  "React",
  "Next.js",
  "Ruby on Rails",
  "Ruby",
  "Node.js",
  "Python",
  "React Native",
  "Tailwind CSS",
  "Google Cloud",
  "MongoDB",
  "Supabase",
];

/** Dónde encontrarlo. El orden es el de utilidad para quien quiere contactarlo. */
export const PROFILE_LINKS = [
  { title: "GitHub", url: GITHUB_URL, description: "Código y proyectos." },
  {
    title: "LinkedIn",
    url: LINKEDIN_URL,
    description: "Trayectoria profesional y contacto.",
  },
  {
    title: "WhatsApp",
    url: WHATSAPP_URL,
    description: "Contacto directo para clases y consultas.",
  },
];
