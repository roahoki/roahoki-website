import { SidebarNav } from "@/components/sidebar-nav"
import { YouTubeEmbed } from "@/components/youtube-embed"
import { getTranslations } from "next-intl/server"

const videos = [
  { id: "OtfZFL0bfXQ", title: "Video 1" },
  { id: "PWOx9DPYoWE", title: "Video 2" },
  { id: "d40mVuVLqTE", title: "Video 3" },
]

export default async function ProjectsPage() {
  const t = await getTranslations("projects")

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <div className="border-b border-border md:border-b-0 md:w-32 md:shrink-0">
        <SidebarNav />
      </div>
      <div className="md:border-l md:border-border flex-1">
        <article className="px-6 py-6 md:max-w-xl md:pt-12 md:pl-8 md:pr-8">
          <p className="text-sm leading-relaxed text-foreground/90 mb-6">
            {t("intro")}
          </p>

          <div className="space-y-4 md:space-y-6">
            {videos.map((video) => (
              <YouTubeEmbed key={video.id} videoId={video.id} title={video.title} />
            ))}
          </div>
        </article>
      </div>
    </main>
  )
}
