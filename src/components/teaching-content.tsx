import {
  type Testimonial,
  TestimonialCard,
} from "@/components/testimonial-card";
import { listApprovedTestimonials } from "@/lib/testimonials/queries";

function SubjectCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 hover:border-brand/40 hover:bg-brand-muted transition-colors duration-200 ${delay}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-brand mt-0.5 shrink-0">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-foreground mb-1.5">{title}</h3>
          <p className="text-sm leading-relaxed text-foreground/75">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

const WHATSAPP_URL = "https://wa.link/ht8ioc";

export async function TeachingContent() {
  let approved: Testimonial[] = [];
  try {
    approved = await listApprovedTestimonials();
  } catch {
    // Si la base no responde, se muestra el estado vacío: una sección
    // secundaria no debería voltear la página entera.
  }

  return (
    <article className="px-6 py-6 md:max-w-xl md:pt-12 md:pl-8 md:pr-8">
      {/* Header */}
      <h1 className="text-base font-bold text-foreground mb-3 animate-fade-up">
        Clases particulares
      </h1>
      <p className="text-sm leading-relaxed text-foreground/85 mb-8 animate-fade-up-delay-1">
        Doy clases particulares a estudiantes de ingeniería de la PUC. Me adapto
        a tu forma de aprender y vamos al ritmo que necesites. No existen
        preguntas tontas ni temas que no se puedan entender.
      </p>

      {/* Subjects */}
      <section className="mb-8 animate-fade-up-delay-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand mb-3">
          Materias
        </h2>
        <div className="flex flex-col gap-3">
          <SubjectCard
            delay="animate-fade-up-delay-2"
            icon={
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 10h16M4 14h8M4 18h6"
                />
              </svg>
            }
            title="Estructuras de Datos"
            description="Listas enlazadas, pilas, colas, árboles, grafos y algoritmos de búsqueda y ordenamiento. Desde la base conceptual hasta implementar lo que te pide el profe."
          />
          <SubjectCard
            delay="animate-fade-up-delay-3"
            icon={
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            }
            title="Programación Avanzada"
            description="Paradigmas de programación, patrones de diseño, manejo de memoria y concurrencia. Lo que te hace pasar de código que funciona a código que es realmente bueno."
          />
        </div>
      </section>

      {/* Teaching Background */}
      <section className="mb-8 animate-fade-up-delay-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand mb-3">
          Mi experiencia docente
        </h2>
        <p className="text-sm leading-relaxed text-foreground/85">
          Fui Coordinador General del curso Arquitectura de Computadores y
          ayudante en Tecnologías y Aplicaciones Web, Estructuras de Datos y
          Programación Avanzada en la PUC. Si algo aprendí es que cada persona
          tiene su propia forma de entender las cosas, y me encanta encontrar
          cuál es la tuya.
        </p>
      </section>

      {/* CTA */}
      <section className="mb-8 animate-fade-up-delay-3 rounded-xl border border-brand/25 bg-brand-muted p-5">
        <h2 className="text-sm font-bold text-foreground mb-1.5">
          ¿Necesitas una clase?
        </h2>
        <p className="text-sm leading-relaxed text-foreground/75 mb-4">
          Escríbeme por WhatsApp y coordinamos horario y precio según tu
          situación. Sin compromiso, la primera conversación es gratis :)
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Escríbeme por WhatsApp
        </a>
      </section>

      {/* Testimonials */}
      <section className="animate-fade-up-delay-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand">
            Lo que dicen mis estudiantes
          </h2>
          <a
            href="testimonials/new"
            className="text-xs text-brand hover:underline"
          >
            Deja el tuyo
          </a>
        </div>

        {approved.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-5 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Pronto estarán acá... estoy juntando los testimonios de mis
              alumnos.
            </p>
            <a
              href="testimonials/new"
              className="text-xs text-brand hover:underline"
            >
              Se el primero en dejar un testimonio
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approved.map((testimonial) => (
              <TestimonialCard key={testimonial.id} t={testimonial} />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
