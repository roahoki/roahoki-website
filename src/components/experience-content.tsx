import Image from "next/image";
import type React from "react";
import { AtipicusIcon } from "@/components/icons/atipicus-icon";
import { BiomechanicsIcon } from "@/components/icons/biomechanics-icon";
import { MestiIcon } from "@/components/icons/mesti-icon";
import { UCIcon } from "@/components/icons/uc-icon";

function FaviconIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/favicon.ico"
      alt="icon"
      width={size}
      height={size}
      className={className}
    />
  );
}

interface ProjectSectionProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: 0 | 1 | 2 | 3;
}

function ProjectSection({
  icon,
  title,
  children,
  delay = 0,
}: ProjectSectionProps) {
  const delayClass =
    delay === 0
      ? "animate-fade-up"
      : delay === 1
        ? "animate-fade-up-delay-1"
        : delay === 2
          ? "animate-fade-up-delay-2"
          : "animate-fade-up-delay-3";

  return (
    <section className={`mb-8 ${delayClass}`}>
      <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2.5">
        {icon ? (
          <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg overflow-hidden">
            {icon}
          </span>
        ) : null}
        <span className="flex items-center gap-2">
          {title}
          <span className="h-px w-6 bg-brand/50 inline-block" />
        </span>
      </h2>
      <div className="text-sm leading-relaxed text-foreground/85 pl-10">
        {children}
      </div>
    </section>
  );
}

const linkClass =
  "underline underline-offset-2 decoration-brand/50 hover:decoration-brand hover:text-foreground transition-colors";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );
}

export function ExperienceContent() {
  return (
    <article className="px-6 py-6 md:max-w-xl md:pt-12 md:pl-8 md:pr-8">
      <h1 className="text-base font-bold text-foreground mb-2 animate-fade-up">
        Experiencia
      </h1>
      <p className="text-sm leading-relaxed text-foreground/60 mb-8 animate-fade-up-delay-1">
        Me especializo en el desarrollo Full Stack moderno, desde arquitectura
        en la nube hasta interfaces de usuario escalables.
      </p>

      <ProjectSection
        icon={<AtipicusIcon className="w-full h-full" />}
        title="Atipicus"
        delay={1}
      >
        <p>
          Trabajé como Software Engineer Trainee en{" "}
          <ExternalLink href="https://atipic.us/">Atipicus</ExternalLink>,
          desarrollando un sistema de agente de IA centrado en el sector de la
          salud. Mi stack incluyó el uso avanzado del{" "}
          <ExternalLink href="https://cloud.google.com/">
            Google SDK
          </ExternalLink>
          , infraestructura en{" "}
          <ExternalLink href="https://cloud.google.com/">
            Google Cloud
          </ExternalLink>{" "}
          y gestión de datos con{" "}
          <ExternalLink href="https://www.mongodb.com/">MongoDB</ExternalLink>.
        </p>
      </ProjectSection>

      <ProjectSection
        icon={
          <BiomechanicsIcon size={32} className="object-contain rounded-lg" />
        }
        title="Biomechanics.wav"
        delay={2}
      >
        <p>
          Estuve a cargo del desarrollo fullstack del sitio oficial de{" "}
          <ExternalLink href="https://www.biomechanics.cl/links">
            Biomechanics
          </ExternalLink>
          , un proyecto artístico-tecnológico. Tomé todas las decisiones
          técnicas, utilizando{" "}
          <ExternalLink href="https://nextjs.org">Next.js</ExternalLink>,{" "}
          <ExternalLink href="https://supabase.com">Supabase</ExternalLink> y{" "}
          <ExternalLink href="https://clerk.com">Clerk</ExternalLink>.
          Implementé una arquitectura escalable de back-office y optimicé el SEO
          para asegurar un alto rendimiento en producción.
        </p>
      </ProjectSection>

      <ProjectSection
        icon={<FaviconIcon size={32} className="object-contain rounded-lg" />}
        title="Freelance Fullstack"
        delay={3}
      >
        <p>
          Participé en el desarrollo de una plataforma completa de apuestas
          deportivas utilizando{" "}
          <ExternalLink href="https://react.dev">React</ExternalLink> y{" "}
          <ExternalLink href="https://nodejs.org">Node.js</ExternalLink>. El
          proyecto incluyó la implementación de workers, funciones serverless y
          un pipeline de CI/CD. Desplegué la infraestructura utilizando
          servicios de{" "}
          <ExternalLink href="https://aws.amazon.com">AWS</ExternalLink> como
          EC2, CloudFront y S3.
        </p>
      </ProjectSection>

      <ProjectSection
        icon={<MestiIcon className="w-full h-full" />}
        title="Mesti"
        delay={3}
      >
        <p>
          Me desempeñé como Líder Técnico Mobile para el cliente{" "}
          <ExternalLink href="https://mesti.app/">Mesti</ExternalLink>. Dirigí
          el desarrollo de tres aplicaciones móviles con{" "}
          <ExternalLink href="https://reactnative.dev">
            React Native
          </ExternalLink>
          , incluyendo gestión de menús y herramientas para bartenders. Coordiné
          al equipo de desarrolladores y gestioné el ciclo completo desde el
          levantamiento de requerimientos hasta el despliegue.
        </p>
      </ProjectSection>

      <ProjectSection
        icon={<UCIcon className="w-full h-full" />}
        title="PUC Chile"
        delay={3}
      >
        <p>
          Poseo una sólida trayectoria académica y docente en la Pontificia
          Universidad Católica de Chile. He sido Coordinador General del curso
          Arquitectura de Computadores e impartido ayudantías en cátedras clave
          como Tecnologías y Aplicaciones Web, Estructuras de Datos y
          Programación Avanzada.
        </p>
      </ProjectSection>
    </article>
  );
}
