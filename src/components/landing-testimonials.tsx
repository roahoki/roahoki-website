import { getTranslations } from "next-intl/server"
import { type Testimonial, TestimonialCard } from "@/components/testimonial-card"
import { Link } from "@/i18n/navigation"
import { supabaseAnon } from "@/lib/supabase"

export async function LandingTestimonials() {
  const tTeach = await getTranslations("teaching")
  const tForm = await getTranslations("testimonialForm")

  let testimonials: Testimonial[] = []
  try {
    const { data } = await supabaseAnon()
      .from("testimonials")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(3)
    testimonials = (data ?? []) as Testimonial[]
  } catch {
    // silently fail — show empty state if Supabase is unreachable
  }

  return (
    <div>
      {testimonials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{tTeach("testimonials_coming")}</p>
          <Link
            href="/testimonials/new"
            className="inline-flex items-center gap-1.5 text-sm text-brand font-semibold hover:underline"
          >
            {tTeach("testimonials_leave_cta")} &rarr;
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
              {tForm("cta_leave")} &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
