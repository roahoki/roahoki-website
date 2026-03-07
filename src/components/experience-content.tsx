import React from "react"
import { getTranslations } from "next-intl/server"
import Image from "next/image"

interface ProjectSectionProps {
  icon?: string
  iconSrc?: string
  title: string
  children: React.ReactNode
}

function ProjectSection({ icon, iconSrc, title, children }: ProjectSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        {iconSrc ? (
          <Image src={iconSrc} alt={title} width={20} height={20} className="object-contain" />
        ) : icon ? (
          <span>{icon}</span>
        ) : null}
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

const linkClass = "underline underline-offset-2 hover:text-foreground/70"

const extLink = (href: string) =>
  (chunks: React.ReactNode) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {chunks}
    </a>
  )

export async function ExperienceContent() {
  const t = await getTranslations("experience")

  return (
    <article className="px-6 py-6 md:max-w-xl md:pt-12 md:pl-8 md:pr-8">
      <h1 className="text-base font-semibold text-foreground mb-4">{t("title")}</h1>

      <p className="text-sm leading-relaxed text-foreground/90 mb-8">{t("subtitle")}</p>

      <ProjectSection icon="A" title="Atipicus">
        <p>
          {t.rich("atipicus", {
            atipicus: extLink("https://atipic.us/"),
            googleSDK: extLink("https://cloud.google.com/"),
            googleCloud: extLink("https://cloud.google.com/"),
            mongodb: extLink("https://www.mongodb.com/"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon="B" title="Biomechanics.wav">
        <p>
          {t.rich("biomechanics", {
            biomechanics: extLink("https://www.biomechanics.cl/links"),
            nextjs: extLink("https://nextjs.org"),
            supabase: extLink("https://supabase.com"),
            clerk: extLink("https://clerk.com"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon="F" title="Freelance Fullstack">
        <p>
          {t.rich("freelance", {
            react: extLink("https://react.dev"),
            nodejs: extLink("https://nodejs.org"),
            aws: extLink("https://aws.amazon.com"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon="M" title="Mesti">
        <p>
          {t.rich("mesti", {
            mesti: extLink("https://mesti.app/"),
            reactNative: extLink("https://reactnative.dev"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon="P" title="PUC Chile">
        <p>{t("puc")}</p>
      </ProjectSection>
    </article>
  )
}