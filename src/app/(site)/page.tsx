import Image from "next/image";
import { Suspense } from "react";
import { AnimateIn } from "@/components/animate-in";
import { AtipicusIcon } from "@/components/icons/atipicus-icon";
import { BiomechanicsIcon } from "@/components/icons/biomechanics-icon";
import { BukIcon } from "@/components/icons/buk-icon";
import { MestiIcon } from "@/components/icons/mesti-icon";
import { PlannisthenicsIcon } from "@/components/icons/plannisthenics-icon";
import { UCIcon } from "@/components/icons/uc-icon";
import { LandingTestimonials } from "@/components/landing-testimonials";
import { Navbar } from "@/components/navbar";
import { YouTubeEmbed } from "@/components/youtube-embed";

const WHATSAPP = "https://wa.link/ht8ioc";
const GITHUB = "https://github.com/roahoki";
const LINKEDIN = "https://www.linkedin.com/in/joaquin-peralta-perez/";

const stack = [
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

const videos = [
  { id: "OtfZFL0bfXQ", title: "Estructuras de Datos" },
  { id: "PWOx9DPYoWE", title: "Estructuras de Datos" },
  { id: "d40mVuVLqTE", title: "Arquitectura de Computadores" },
];

export default function HomePage() {
  const linkClass =
    "underline underline-offset-2 decoration-brand/50 hover:decoration-brand hover:text-foreground transition-colors";

  const ExternalLink = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ====================================================
            HERO
        ==================================================== */}
        <section
          id="hero"
          className="relative pt-20 pb-16 md:pt-28 md:pb-24 min-h-[88vh] flex flex-col justify-center overflow-hidden"
        >
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute top-1/4 -left-16 w-96 h-96 rounded-full bg-brand/6 blur-3xl" />
            <div className="absolute bottom-1/4 -right-16 w-72 h-72 rounded-full bg-brand/4 blur-3xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-6 items-center">
            {/* Text */}
            <div className="md:col-span-3 space-y-6">
              <AnimateIn delay={0}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/35 bg-brand-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span className="text-xs text-brand font-semibold">
                    Disponible para nuevas oportunidades
                  </span>
                </div>
              </AnimateIn>

              <AnimateIn delay={80}>
                <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[0.93]">
                  <span className="text-foreground">Joaquín</span>
                  <br />
                  <span className="text-brand">Peralta</span>
                  <span className="text-foreground/30">.</span>
                </h1>
              </AnimateIn>

              <AnimateIn delay={160}>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Software Engineer",
                    "Diseñador",
                    "Atleta de Calistenia",
                  ].map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1 rounded-full border border-border text-xs text-muted-foreground font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </AnimateIn>

              <AnimateIn delay={240}>
                <p className="text-base md:text-lg text-foreground/60 leading-relaxed max-w-md">
                  Construyo con propósito, diseño experiencias y enseño lo que
                  aprendo.
                </p>
              </AnimateIn>

              <AnimateIn delay={320}>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="#projects"
                    className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                  >
                    Ver mi trabajo &darr;
                  </a>
                  <a
                    href={WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:border-brand/40 hover:bg-brand-muted transition-all duration-150"
                  >
                    Hablemos &rarr;
                  </a>
                </div>
              </AnimateIn>
            </div>

            {/* Photo */}
            <div className="md:col-span-2 flex justify-center md:justify-end">
              <AnimateIn delay={200} from="right">
                <div className="w-60 h-60 md:w-72 md:h-72 rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/30">
                  <Image
                    src="https://avatars.githubusercontent.com/roahoki"
                    alt="Joaquín Peralta"
                    width={288}
                    height={288}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              </AnimateIn>
            </div>
          </div>
        </section>

        {/* ====================================================
            BENTO INFO GRID
        ==================================================== */}
        <section id="about" className="pb-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {/* Current role */}
            <AnimateIn delay={0} className="col-span-2 md:col-span-2">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:bg-brand-muted transition-colors duration-300">
                <div className="flex items-center gap-4 h-full">
                  <BukIcon size={48} className="object-contain shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Actualmente en
                    </span>
                    <p className="text-sm font-bold text-foreground mb-1">
                      Buk
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Equipo de Cultura — refactorizando el módulo de encuestas
                      laborales con Rails.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Teaching stat */}
            <AnimateIn delay={80} className="col-span-1 md:col-span-2">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:bg-brand-muted transition-colors duration-300">
                <p className="text-4xl font-extrabold text-brand leading-none mb-2">
                  +4
                </p>
                <p className="text-xs font-bold text-foreground mb-1">
                  años enseñando
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  como ayudante y coordinador en la PUC
                </p>
              </div>
            </AnimateIn>

            {/* Location + Calisthenics */}
            <AnimateIn delay={160} className="col-span-1 md:col-span-2">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:bg-brand-muted transition-colors duration-300 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    Santiago, Chile
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Trabajo híbrido
                  </p>
                </div>
                <div className="pt-4 border-t border-border mt-4">
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    Calistenia
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fuera del código, entreno calistenia
                  </p>
                </div>
              </div>
            </AnimateIn>

            {/* Stack */}
            <AnimateIn delay={240} className="col-span-2 md:col-span-4">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-300">
                <p className="text-xs font-bold text-brand uppercase tracking-widest mb-3">
                  Stack
                </p>
                <div className="flex flex-wrap gap-2">
                  {stack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-lg bg-muted text-xs text-foreground/70 font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </AnimateIn>

            {/* Bio */}
            <AnimateIn delay={320} className="col-span-2 md:col-span-2">
              <div className="h-full rounded-2xl border border-border bg-card p-5">
                <p className="text-xs leading-relaxed text-foreground/80 mb-3">
                  Soy Ingeniero de Software en{" "}
                  <ExternalLink href="https://www.buk.cl/">Buk</ExternalLink>,
                  donde trabajo en el equipo de Cultura refactorizando el módulo
                  de encuestas laborales. Me apasiona todo el stack: desde
                  infraestructura hasta interfaces de usuario. Llevo más de 4
                  años enseñando programación en la{" "}
                  <ExternalLink href="https://www.uc.cl/">PUC</ExternalLink>.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Encuentra mi trabajo en{" "}
                  <ExternalLink href={GITHUB}>GitHub</ExternalLink> o
                  interactuemos por{" "}
                  <ExternalLink href={LINKEDIN}>LinkedIn</ExternalLink> y{" "}
                  <ExternalLink href={WHATSAPP}>WhatsApp</ExternalLink>.
                </p>
              </div>
            </AnimateIn>
          </div>
        </section>

        {/* ====================================================
            EXPERIENCE
        ==================================================== */}
        <section id="experience" className="pb-24">
          <AnimateIn delay={0}>
            <h2 className="text-2xl font-extrabold text-foreground mb-8">
              Experiencia
              <span className="text-brand">.</span>
            </h2>
          </AnimateIn>

          <div className="space-y-3">
            {/* Buk */}
            <AnimateIn delay={60}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <BukIcon size={40} className="object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-foreground">Buk</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-muted text-brand font-semibold border border-brand/20">
                        Actual
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Software Engineer · may. 2026 — presente
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      Trabajo como Ingeniero de Software en{" "}
                      <ExternalLink href="https://www.buk.cl/">
                        Buk
                      </ExternalLink>{" "}
                      dentro del equipo de Cultura. Mi principal desafío es
                      refactorizar y unificar el módulo de encuestas laborales,
                      trabajando con Ruby on Rails y Ruby.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Atipicus */}
            <AnimateIn delay={110}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <AtipicusIcon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-foreground">
                        Atipicus
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Software Engineer Trainee · dic. 2025 — mar. 2026
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      Trabajé como Software Engineer Trainee en{" "}
                      <ExternalLink href="https://atipic.us/">
                        Atipicus
                      </ExternalLink>
                      , desarrollando un sistema de agente de IA centrado en el
                      sector de la salud. Mi stack incluyó el uso avanzado del{" "}
                      <ExternalLink href="https://cloud.google.com/">
                        Google SDK
                      </ExternalLink>
                      , infraestructura en{" "}
                      <ExternalLink href="https://cloud.google.com/">
                        Google Cloud
                      </ExternalLink>{" "}
                      y gestión de datos con{" "}
                      <ExternalLink href="https://www.mongodb.com/">
                        MongoDB
                      </ExternalLink>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Biomechanics */}
            <AnimateIn delay={160}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <BiomechanicsIcon size={40} className="object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      Biomechanics.wav
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Full Stack Developer · 2024 — 2025
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      Estuve a cargo del desarrollo fullstack del sitio oficial
                      de{" "}
                      <ExternalLink href="https://www.biomechanics.cl/links">
                        Biomechanics
                      </ExternalLink>
                      , un proyecto artístico-tecnológico. Tomé todas las
                      decisiones técnicas, utilizando{" "}
                      <ExternalLink href="https://nextjs.org">
                        Next.js
                      </ExternalLink>
                      ,{" "}
                      <ExternalLink href="https://supabase.com">
                        Supabase
                      </ExternalLink>{" "}
                      y{" "}
                      <ExternalLink href="https://clerk.com">
                        Clerk
                      </ExternalLink>
                      . Implementé una arquitectura escalable de back-office y
                      optimicé el SEO para asegurar un alto rendimiento en
                      producción.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Freelance */}
            <AnimateIn delay={210}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      Freelance Fullstack
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Full Stack Developer · 2024
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      Participé en el desarrollo de una plataforma completa de
                      apuestas deportivas utilizando{" "}
                      <ExternalLink href="https://react.dev">
                        React
                      </ExternalLink>{" "}
                      y{" "}
                      <ExternalLink href="https://nodejs.org">
                        Node.js
                      </ExternalLink>
                      . El proyecto incluyó la implementación de workers,
                      funciones serverless y un pipeline de CI/CD. Desplegué la
                      infraestructura utilizando servicios de{" "}
                      <ExternalLink href="https://aws.amazon.com">
                        AWS
                      </ExternalLink>{" "}
                      como EC2, CloudFront y S3.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Mesti */}
            <AnimateIn delay={260}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <MestiIcon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      Mesti
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Mobile Technical Lead · 2024
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      Me desempeñé como Líder Técnico Mobile para el cliente{" "}
                      <ExternalLink href="https://mesti.app/">
                        Mesti
                      </ExternalLink>
                      . Dirigí el desarrollo de tres aplicaciones móviles con{" "}
                      <ExternalLink href="https://reactnative.dev">
                        React Native
                      </ExternalLink>
                      , incluyendo gestión de menús y herramientas para
                      bartenders. Coordiné al equipo de desarrolladores y
                      gestioné el ciclo completo desde el levantamiento de
                      requerimientos hasta el despliegue.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* PUC */}
            <AnimateIn delay={310}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <UCIcon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      PUC Chile
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Teaching Assistant &amp; General Coordinator · 2022 — 2025
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      Poseo una sólida trayectoria académica y docente en la
                      Pontificia Universidad Católica de Chile. He sido
                      Coordinador General del curso Arquitectura de Computadores
                      e impartido ayudantías en cátedras clave como Tecnologías
                      y Aplicaciones Web, Estructuras de Datos y Programación
                      Avanzada.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </section>

        {/* ====================================================
            PROJECTS
        ==================================================== */}
        <section id="projects" className="pb-24">
          <AnimateIn delay={0}>
            <h2 className="text-2xl font-extrabold text-foreground mb-8">
              Proyectos
              <span className="text-brand">.</span>
            </h2>
          </AnimateIn>

          {/* Biomechanics featured card */}
          <AnimateIn delay={80} className="mb-6">
            <div className="rounded-2xl border border-border overflow-hidden hover:border-brand/30 transition-colors duration-200">
              <div className="bg-zinc-950 p-6 sm:p-8 border-b border-white/6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <BiomechanicsIcon size={48} className="object-contain" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Biomechanics.wav
                      </h3>
                      <p className="text-xs text-white/45">
                        Sitio web artístico-tecnológico
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.biomechanics.cl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl border border-white/15 text-white text-xs font-semibold hover:bg-white/10 transition-colors duration-150"
                  >
                    Visitar ↗
                  </a>
                </div>
              </div>
              <div className="bg-card p-5 sm:p-6">
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                  Desarrollo fullstack del sitio oficial. Arquitectura escalable
                  de back-office, gestión de contenido y optimización SEO para
                  alto rendimiento en producción.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Next.js", "TypeScript", "Supabase", "Clerk"].map(
                    (tech) => (
                      <span
                        key={tech}
                        className="px-2.5 py-1 rounded-lg bg-muted text-xs text-foreground/60 font-medium"
                      >
                        {tech}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </AnimateIn>

          {/* Plannisthenics */}
          <AnimateIn delay={120} className="mb-6">
            <div className="rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  <PlannisthenicsIcon className="w-8 h-8 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-foreground">
                      Plannisthenics
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      En desarrollo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    App web de calistenia
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/70 mb-3">
                    App para estructurar y registrar tu entrenamiento de
                    calistenia. Planifica rutinas, controla tu progreso y
                    organiza tus sesiones de entrenamiento.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Ruby on Rails", "Ruby"].map((tech) => (
                      <span
                        key={tech}
                        className="px-2.5 py-1 rounded-lg bg-muted text-xs text-foreground/60 font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>

          {/* YouTube */}
          <AnimateIn delay={160} className="mb-4">
            <p className="text-sm text-muted-foreground">
              Videos en YouTube enseñando estructuras de datos y arquitectura de
              computadores.
            </p>
          </AnimateIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {videos.map((v, i) => (
              <AnimateIn key={v.id} delay={i * 60 + 220}>
                <YouTubeEmbed videoId={v.id} title={v.title} />
              </AnimateIn>
            ))}
          </div>
        </section>

        {/* ====================================================
            TEACHING
        ==================================================== */}
        <section id="teaching" className="pb-24">
          <AnimateIn delay={0}>
            <h2 className="text-2xl font-extrabold text-foreground mb-8">
              Clases particulares
              <span className="text-brand">.</span>
            </h2>
          </AnimateIn>

          <AnimateIn delay={80} className="mb-4">
            <div className="rounded-2xl border border-brand/30 bg-brand-muted p-6 sm:p-8">
              <p className="text-sm leading-relaxed text-foreground/85 mb-6 max-w-xl">
                Doy clases particulares a estudiantes de ingeniería de la PUC.
                Me adapto a tu forma de aprender y vamos al ritmo que necesites.
                No existen preguntas tontas ni temas que no se puedan entender.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    Estructuras de Datos
                  </h3>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Listas enlazadas, pilas, colas, árboles, grafos y algoritmos
                    de búsqueda y ordenamiento. Desde la base conceptual hasta
                    implementar lo que te pide el profe.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    Programación Avanzada
                  </h3>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Paradigmas de programación, patrones de diseño, manejo de
                    memoria y concurrencia. Lo que te hace pasar de código que
                    funciona a código que es realmente bueno.
                  </p>
                </div>
              </div>

              <p className="text-xs text-foreground/55 mb-6 max-w-xl">
                Fui Coordinador General del curso Arquitectura de Computadores y
                ayudante en Tecnologías y Aplicaciones Web, Estructuras de Datos
                y Programación Avanzada en la PUC. Si algo aprendí es que cada
                persona tiene su propia forma de entender las cosas, y me
                encanta encontrar cuál es la tuya.
              </p>

              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.97] transition-all duration-150"
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Escríbeme por WhatsApp
              </a>
            </div>
          </AnimateIn>

          <AnimateIn delay={160}>
            <Suspense
              fallback={
                <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Pronto estarán acá... estoy juntando los testimonios de mis
                    alumnos.
                  </p>
                </div>
              }
            >
              <LandingTestimonials />
            </Suspense>
          </AnimateIn>
        </section>

        {/* ====================================================
            CONTACT
        ==================================================== */}
        <section id="contact" className="pb-28">
          <AnimateIn delay={0}>
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-14 text-center">
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
                Hablemos
                <span className="text-brand">.</span>
              </h2>
              <p className="text-sm text-muted-foreground mb-10 max-w-xs mx-auto">
                Abierto a roles SWE, freelance y clases particulares.
                Conversemos.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href={GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:border-brand/40 hover:bg-brand-muted transition-all duration-150"
                >
                  GitHub
                </a>
                <a
                  href={LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:border-brand/40 hover:bg-brand-muted transition-all duration-150"
                >
                  LinkedIn
                </a>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </AnimateIn>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Joaquín Peralta</span>
          <span>Hecho por roahoki</span>
        </div>
      </footer>
    </div>
  );
}
