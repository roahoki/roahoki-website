import Image from "next/image";
import Link from "next/link";

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

export function PageContent() {
  return (
    <article className="px-6 py-6 md:max-w-xl md:pt-12 md:pl-8 md:pr-0">
      <div className="animate-fade-up mb-6 flex items-center gap-4">
        <Image
          src="https://avatars.githubusercontent.com/roahoki"
          alt="Joaquín Peralta"
          width={52}
          height={52}
          className="rounded-full border-2 border-brand/30 shrink-0"
          priority
        />
        <h1 className="text-base font-bold text-foreground">Joaquín Peralta</h1>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-foreground/85">
        <p className="animate-fade-up-delay-1">
          Soy un Ingeniero de Software y trabajo como Trainee en{" "}
          <ExternalLink href="https://atipic.us/">Atipicus</ExternalLink>.
          Actualmente mi foco está en el desarrollo de Agentes de IA para el
          sector de la salud, pero mis intereses abarcan todo el stack de
          desarrollo, desde la infraestructura en la nube hasta las interfaces
          de usuario.
        </p>

        <p className="animate-fade-up-delay-2">
          Durante mi paso por la universidad tuve el privilegio de trabajar como
          ayudante y coordinador en varios cursos de ingeniería, lo que me
          permitió profundizar mis conocimientos y habilidades pedagógicas. A
          veces hago videos en youtube.
        </p>

        <p className="animate-fade-up-delay-3">
          Puedes conocer más sobre mi historial e intereses a través de mis{" "}
          <Link href="/experience" className={linkClass}>
            experiencias
          </Link>
          ,{" "}
          <Link href="/projects" className={linkClass}>
            proyectos
          </Link>{" "}
          y{" "}
          <ExternalLink href="https://github.com/roahoki">GitHub</ExternalLink>.
          Conversemos por{" "}
          <ExternalLink href="https://www.linkedin.com/in/joaquin-peralta-perez/">
            LinkedIn
          </ExternalLink>{" "}
          o por{" "}
          <ExternalLink href="https://wa.link/ht8ioc">WhatsApp</ExternalLink>.
        </p>
      </div>
    </article>
  );
}
