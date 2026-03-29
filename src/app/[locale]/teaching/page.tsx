import { SidebarNav } from "@/components/sidebar-nav"
import { TeachingContent } from "@/components/teaching-content"

export default function TeachingPage() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <div className="border-b border-border md:border-b-0 md:w-32 md:shrink-0">
        <SidebarNav />
      </div>
      <div className="md:border-l md:border-border flex-1">
        <TeachingContent />
      </div>
    </main>
  )
}
