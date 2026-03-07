import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

const externalLinkClass = "underline underline-offset-2 hover:text-foreground"

export async function PageContent() {
  const t = await getTranslations("about")

  const internalLink = (href: string) =>
    (chunks: React.ReactNode) => (
      <Link href={href} className={externalLinkClass}>
        {chunks}
      </Link>
    )

  const externalLink = (href: string) =>
    (chunks: React.ReactNode) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>
        {chunks}
      </a>
    )

  return (
    <article className="px-6 py-6 md:max-w-xl md:pt-12 md:pl-8 md:pr-0">
      <h1 className="text-base font-semibold text-foreground mb-6">{t("name")}</h1>

      <div className="space-y-5 text-sm leading-relaxed text-foreground/90">
        <p>
          {t.rich("p1", {
            atipicus: externalLink("https://atipic.us/"),
          })}
        </p>

        <p>{t("p2")}</p>

        <p>
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