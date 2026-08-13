import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

const linkClass =
  "underline underline-offset-2 decoration-brand/50 hover:decoration-brand hover:text-foreground transition-colors"

export async function PageContent() {
  const t = await getTranslations("about")

  const internalLink = (href: string) =>
    (chunks: React.ReactNode) => (
      <Link href={href} className={linkClass}>
        {chunks}
      </Link>
    )

  const externalLink = (href: string) =>
    (chunks: React.ReactNode) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {chunks}
      </a>
    )

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
        <h1 className="text-base font-bold text-foreground">{t("name")}</h1>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-foreground/85">
        <p className="animate-fade-up-delay-1">
          {t.rich("p1", {
            atipicus: externalLink("https://atipic.us/"),
          })}
        </p>

        <p className="animate-fade-up-delay-2">{t("p2")}</p>

        <p className="animate-fade-up-delay-3">
          {t.rich("p3", {
            experiences: internalLink("/experience"),
            projects: internalLink("/projects"),
            github: externalLink("https://github.com/roahoki"),
            linkedin: externalLink("https://www.linkedin.com/in/joaquin-peralta-perez/"),
            whatsapp: externalLink("https://wa.link/ht8ioc"),
          })}
        </p>
      </div>
    </article>
  )
}
