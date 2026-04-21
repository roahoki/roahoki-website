"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { Testimonial } from "@/components/testimonial-card"

type Filter = "all" | "pending" | "approved" | "rejected"

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  approved: "text-green-500 bg-green-500/10 border-green-500/20",
  rejected: "text-red-500 bg-red-500/10 border-red-500/20",
}

const FILTER_LABELS: Record<Filter, string> = {
  all: "Todos",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchTestimonials = useCallback(async () => {
    const res = await fetch("/api/admin/testimonials")
    if (res.status === 401) { router.push("/admin/login"); return }
    const data = await res.json()
    setTestimonials(data.testimonials ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchTestimonials() }, [fetchTestimonials])

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, status: status as Testimonial["status"] } : t)))
  }

  async function deleteTestimonial(id: string) {
    if (!confirm("Eliminar este testimonio?")) return
    await fetch("/api/admin/testimonials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setTestimonials((prev) => prev.filter((t) => t.id !== id))
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  const filtered = filter === "all" ? testimonials : testimonials.filter((t) => t.status === filter)

  const counts = {
    all: testimonials.length,
    pending: testimonials.filter((t) => t.status === "pending").length,
    approved: testimonials.filter((t) => t.status === "approved").length,
    rejected: testimonials.filter((t) => t.status === "rejected").length,
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-sm font-bold text-foreground shrink-0">Testimonios</h1>
        <div className="flex items-center gap-4">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Ir al sitio
          </a>
          <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            Cerrar sesion
          </button>
        </div>
      </div>

      {/* Filters — horizontally scrollable on mobile */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              filter === f
                ? "bg-brand text-white border-brand"
                : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
            }`}
          >
            {FILTER_LABELS[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center py-12">Cargando...</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">No hay testimonios.</p>
      )}

      <div className="space-y-4">
        {filtered.map((t) => {
          const initials = t.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
          const socialLink = t.linkedin_url
            ? { href: t.linkedin_url, label: "LinkedIn" }
            : t.github_username
            ? { href: `https://github.com/${t.github_username}`, label: `@${t.github_username}` }
            : null

          return (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              {/* Identity row */}
              <div className="flex items-start gap-3 mb-3">
                {t.image_url ? (
                  <Image
                    src={t.image_url}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="rounded-full w-10 h-10 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-bold text-foreground truncate">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_COLORS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  {socialLink && (
                    <a href={socialLink.href} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline block truncate">
                      {socialLink.label}
                    </a>
                  )}
                  {!socialLink && t.email && (
                    <span className="text-xs text-muted-foreground block truncate">{t.email}</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(t.created_at).toLocaleDateString("es-CL")}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-foreground/80 mb-4">{t.message}</p>

              {/* Actions — full width on mobile */}
              <div className="grid grid-cols-3 gap-2">
                {t.status !== "approved" ? (
                  <button
                    onClick={() => updateStatus(t.id, "approved")}
                    className="py-2 rounded-lg text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                  >
                    Aprobar
                  </button>
                ) : (
                  <div />
                )}
                {t.status !== "rejected" ? (
                  <button
                    onClick={() => updateStatus(t.id, "rejected")}
                    className="py-2 rounded-lg text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                  >
                    Rechazar
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => deleteTestimonial(t.id)}
                  className="py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors col-start-3"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
