import React from "react"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { AtipicusIcon } from "@/components/icons/atipicus-icon"
import { BiomechanicsIcon } from "@/components/icons/biomechanics-icon"
import { MestiIcon } from "@/components/icons/mesti-icon"
import { UCIcon } from "@/components/icons/uc-icon"

function FaviconIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/favicon.ico"
      alt="icon"
      width={size}
      height={size}
      className={className}
    />
  )
}

interface ProjectSectionProps {
  icon?: React.ReactNode
  title: string
  children: React.ReactNode
  delay?: 0 | 1 | 2 | 3
}

function ProjectSection({ icon, title, children, delay = 0 }: ProjectSectionProps) {
  const delayClass = delay === 0
    ? "animate-fade-up"
    : delay === 1
    ? "animate-fade-up-delay-1"
    : delay === 2
    ? "animate-fade-up-delay-2"
    : "animate-fade-up-delay-3"

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
      <div className="text-sm leading-relaxed text-foreground/85 pl-10">{children}</div>
    </section>
  )
}

const linkClass = "underline underline-offset-2 decoration-brand/50 hover:decoration-brand hover:text-foreground transition-colors"

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
      <h1 className="text-base font-bold text-foreground mb-2 animate-fade-up">{t("title")}</h1>
      <p className="text-sm leading-relaxed text-foreground/60 mb-8 animate-fade-up-delay-1">{t("subtitle")}</p>

      <ProjectSection icon={<AtipicusIcon className="w-full h-full" />} title="Atipicus" delay={1}>
        <p>
          {t.rich("atipicus", {
            atipicus: extLink("https://atipic.us/"),
            googleSDK: extLink("https://cloud.google.com/"),
            googleCloud: extLink("https://cloud.google.com/"),
            mongodb: extLink("https://www.mongodb.com/"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon={<BiomechanicsIcon size={32} className="object-contain rounded-lg" />} title="Biomechanics.wav" delay={2}>
        <p>
          {t.rich("biomechanics", {
            biomechanics: extLink("https://www.biomechanics.cl/links"),
            nextjs: extLink("https://nextjs.org"),
            supabase: extLink("https://supabase.com"),
            clerk: extLink("https://clerk.com"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon={<FaviconIcon size={32} className="object-contain rounded-lg" />} title="Freelance Fullstack" delay={3}>
        <p>
          {t.rich("freelance", {
            react: extLink("https://react.dev"),
            nodejs: extLink("https://nodejs.org"),
            aws: extLink("https://aws.amazon.com"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon={<MestiIcon className="w-full h-full" />} title="Mesti" delay={3}>
        <p>
          {t.rich("mesti", {
            mesti: extLink("https://mesti.app/"),
            reactNative: extLink("https://reactnative.dev"),
          })}
        </p>
      </ProjectSection>

      <ProjectSection icon={<UCIcon className="w-full h-full" />} title="PUC Chile" delay={3}>
        <p>{t("puc")}</p>
      </ProjectSection>
    </article>
  )
}
