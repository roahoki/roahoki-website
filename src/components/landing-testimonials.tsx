import Link from "next/link";
import {
  type Testimonial,
  TestimonialCard,
} from "@/components/testimonial-card";
import { listApprovedTestimonials } from "@/lib/testimonials/queries";

export async function LandingTestimonials() {
  let testimonials: Testimonial[] = [];
  try {
    testimonials = await listApprovedTestimonials(3);
  } catch {
    // Si la base no responde, se muestra el estado vacío: una sección
    // secundaria no debería voltear la landing entera.
  }

  return (
    <div>
      {testimonials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Pronto estarán acá... estoy juntando los testimonios de mis alumnos.
          </p>
          <Link
            href="/testimonials/new"
            className="inline-flex items-center gap-1.5 text-sm text-brand font-semibold hover:underline"
          >
            Tomaste clases conmigo? Deja el tuyo &rarr;
          </Link>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
          <div className="text-center mt-2">
            <Link
              href="/testimonials/new"
              className="text-sm text-brand font-semibold hover:underline"
            >
              Deja el tuyo &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
