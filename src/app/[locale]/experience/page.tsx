import { SidebarNav } from "@/components/sidebar-nav"
import { ExperienceContent } from "@/components/experience-content"

export default function ExperiencePage() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <div className="border-b border-border md:border-b-0 md:w-32 md:shrink-0">
        <SidebarNav />
      </div>
      <div className="md:border-l md:border-border flex-1">
        <ExperienceContent />
      </div>
    </main>
  )
}
