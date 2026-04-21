import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Navbar } from "@/components/navbar"
import { AnimateIn } from "@/components/animate-in"
import { YouTubeEmbed } from "@/components/youtube-embed"
import { AtipicusIcon } from "@/components/icons/atipicus-icon"
import { BiomechanicsIcon } from "@/components/icons/biomechanics-icon"
import { MestiIcon } from "@/components/icons/mesti-icon"
import { UCIcon } from "@/components/icons/uc-icon"
import { BukIcon } from "@/components/icons/buk-icon"
import { PlannisthenicsIcon } from "@/components/icons/plannisthenics-icon"
import { Suspense } from "react"
import { LandingTestimonials } from "@/components/landing-testimonials"

const WHATSAPP = "https://wa.link/ht8ioc"
const GITHUB = "https://github.com/roahoki"
const LINKEDIN = "https://www.linkedin.com/in/joaquin-peralta-perez/"

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
]

const videos = [
  { id: "OtfZFL0bfXQ", title: "Estructuras de Datos" },
  { id: "PWOx9DPYoWE", title: "Estructuras de Datos" },
  { id: "d40mVuVLqTE", title: "Arquitectura de Computadores" },
]

export default async function HomePage() {
  const tHero = await getTranslations("hero")
  const tBento = await getTranslations("bento")
  const tAbout = await getTranslations("about")
  const tExp = await getTranslations("experience")
  const tProj = await getTranslations("projects")
  const tTeach = await getTranslations("teaching")
  const tContact = await getTranslations("contact")

  const linkClass =
    "underline underline-offset-2 decoration-brand/50 hover:decoration-brand hover:text-foreground transition-colors"

  const extLink =
    (href: string) =>
    (chunks: React.ReactNode) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {chunks}
      </a>
    )

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
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
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
                    {tHero("available")}
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
                    tHero("role_swe"),
                    tHero("role_designer"),
                    tHero("role_athlete"),
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
                  {tHero("tagline")}
                </p>
              </AnimateIn>

              <AnimateIn delay={320}>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="#projects"
                    className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                  >
                    {tHero("cta_projects")} &darr;
                  </a>
                  <a
                    href={WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:border-brand/40 hover:bg-brand-muted transition-all duration-150"
                  >
                    {tHero("cta_contact")} &rarr;
                  </a>
                </div>
              </AnimateIn>
            </div>

            {/* Photo */}
            <div className="md:col-span-2 flex justify-center md:justify-end">
              <AnimateIn delay={200} from="right">
                <div className="relative">
                  <div className="w-52 h-52 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/30">
                    <Image
                      src="https://avatars.githubusercontent.com/roahoki"
                      alt="Joaquín Peralta"
                      width={256}
                      height={256}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl bg-brand/15 border border-brand/20" />
                  <div className="absolute -top-2 -left-2 w-5 h-5 rounded-lg bg-brand/10 border border-brand/15" />
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
                <span className="text-xs text-muted-foreground mb-3 block">{tBento("current_role")}</span>
                <BukIcon size={40} className="object-contain mb-3" />
                <p className="text-sm font-bold text-foreground mb-1.5">Buk</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tBento("current_desc")}
                </p>
              </div>
            </AnimateIn>

            {/* Teaching stat */}
            <AnimateIn delay={80} className="col-span-1 md:col-span-2">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:bg-brand-muted transition-colors duration-300">
                <p className="text-4xl font-extrabold text-brand leading-none mb-2">+4</p>
                <p className="text-xs font-bold text-foreground mb-1">
                  {tBento("teaching_stat_label")}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {tBento("teaching_at")}
                </p>
              </div>
            </AnimateIn>

            {/* Location + Calisthenics */}
            <AnimateIn delay={160} className="col-span-1 md:col-span-2">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:bg-brand-muted transition-colors duration-300 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    {tBento("location")}
                  </p>
                </div>
                <div className="pt-4 border-t border-border mt-4">
                  <p className="text-xs font-semibold text-foreground mb-0.5">Calistenia</p>
                  <p className="text-xs text-muted-foreground">{tBento("athlete_desc")}</p>
                </div>
              </div>
            </AnimateIn>

            {/* Stack */}
            <AnimateIn delay={240} className="col-span-2 md:col-span-4">
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:border-brand/30 transition-colors duration-300">
                <p className="text-xs font-bold text-brand uppercase tracking-widest mb-3">
                  {tBento("stack_title")}
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
                  {tAbout.rich("bio", {
                    buk: extLink("https://www.buk.cl/"),
                    puc: extLink("https://www.uc.cl/"),
                  })}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tAbout.rich("bio_cta", {
                    github: extLink(GITHUB),
                    linkedin: extLink(LINKEDIN),
                    whatsapp: extLink(WHATSAPP),
                  })}
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
              {tExp("title")}
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
                        {tExp("current")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Software Engineer · may. 2026 — presente</p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      {tExp.rich("buk", {
                        buk: extLink("https://www.buk.cl/"),
                      })}
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
                      <h3 className="text-sm font-bold text-foreground">Atipicus</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Software Engineer Trainee · dic. 2025 — mar. 2026</p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      {tExp.rich("atipicus", {
                        atipicus: extLink("https://atipic.us/"),
                        googleSDK: extLink("https://cloud.google.com/"),
                        googleCloud: extLink("https://cloud.google.com/"),
                        mongodb: extLink("https://www.mongodb.com/"),
                      })}
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
                    <h3 className="text-sm font-bold text-foreground mb-1">Biomechanics.wav</h3>
                    <p className="text-xs text-muted-foreground mb-2">Full Stack Developer · 2024 — 2025</p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      {tExp.rich("biomechanics", {
                        biomechanics: extLink("https://www.biomechanics.cl/links"),
                        nextjs: extLink("https://nextjs.org"),
                        supabase: extLink("https://supabase.com"),
                        clerk: extLink("https://clerk.com"),
                      })}
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
                    <h3 className="text-sm font-bold text-foreground mb-1">Freelance Fullstack</h3>
                    <p className="text-xs text-muted-foreground mb-2">Full Stack Developer · 2024</p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      {tExp.rich("freelance", {
                        react: extLink("https://react.dev"),
                        nodejs: extLink("https://nodejs.org"),
                        aws: extLink("https://aws.amazon.com"),
                      })}
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
                    <h3 className="text-sm font-bold text-foreground mb-1">Mesti</h3>
                    <p className="text-xs text-muted-foreground mb-2">Mobile Technical Lead · 2024</p>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      {tExp.rich("mesti", {
                        mesti: extLink("https://mesti.app/"),
                        reactNative: extLink("https://reactnative.dev"),
                      })}
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
                    <h3 className="text-sm font-bold text-foreground mb-1">PUC Chile</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Teaching Assistant &amp; General Coordinator · 2022 — 2025
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/70">{tExp("puc")}</p>
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
              {tProj("section_title")}
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
                      <h3 className="text-base font-bold text-white">Biomechanics.wav</h3>
                      <p className="text-xs text-white/45">{tProj("biomechanics_type")}</p>
                    </div>
                  </div>
                  <a
                    href="https://www.biomechanics.cl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl border border-white/15 text-white text-xs font-semibold hover:bg-white/10 transition-colors duration-150"
                  >
                    {tProj("visit")} ↗
                  </a>
                </div>
              </div>
              <div className="bg-card p-5 sm:p-6">
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                  {tProj("biomechanics_desc")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Next.js", "TypeScript", "Supabase", "Clerk"].map((tech) => (
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
                    <h3 className="text-sm font-bold text-foreground">Plannisthenics</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {tProj("in_development")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tProj("plannisthenics_type")}</p>
                  <p className="text-xs leading-relaxed text-foreground/70 mb-3">
                    {tProj("plannisthenics_desc")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Ruby on Rails", "Ruby"].map((tech) => (
                      <span key={tech} className="px-2.5 py-1 rounded-lg bg-muted text-xs text-foreground/60 font-medium">
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
            <p className="text-sm text-muted-foreground">{tProj("youtube_intro")}</p>
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
              {tTeach("title")}
              <span className="text-brand">.</span>
            </h2>
          </AnimateIn>

          <AnimateIn delay={80} className="mb-4">
            <div className="rounded-2xl border border-brand/30 bg-brand-muted p-6 sm:p-8">
              <p className="text-sm leading-relaxed text-foreground/85 mb-6 max-w-xl">
                {tTeach("intro")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    {tTeach("dsa_title")}
                  </h3>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    {tTeach("dsa_desc")}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    {tTeach("advanced_title")}
                  </h3>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    {tTeach("advanced_desc")}
                  </p>
                </div>
              </div>

              <p className="text-xs text-foreground/55 mb-6 max-w-xl">
                {tTeach("background_text")}
              </p>

              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.97] transition-all duration-150"
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {tTeach("cta_button")}
              </a>
            </div>
          </AnimateIn>

          <AnimateIn delay={160}>
            <Suspense
              fallback={
                <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center">
                  <p className="text-sm text-muted-foreground">{tTeach("testimonials_coming")}</p>
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
                {tContact("title")}
                <span className="text-brand">.</span>
              </h2>
              <p className="text-sm text-muted-foreground mb-10 max-w-xs mx-auto">
                {tContact("subtitle")}
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
  )
}
