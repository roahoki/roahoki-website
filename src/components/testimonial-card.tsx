import Image from "next/image"

export type Testimonial = {
  id: string
  name: string
  message: string
  status: "pending" | "approved" | "rejected"
  image_url: string | null
  linkedin_url: string | null
  github_username: string | null
  email: string | null
  created_at: string
}

export function TestimonialCard({ t }: { t: Testimonial }) {
  const initials = t.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const socialLink = t.linkedin_url
    ? { href: t.linkedin_url, label: "LinkedIn" }
    : t.github_username
    ? { href: `https://github.com/${t.github_username}`, label: `@${t.github_username}` }
    : null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
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
          <div className="w-10 h-10 rounded-full bg-brand-muted border border-brand/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand">{initials}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-foreground">{t.name}</p>
          {socialLink ? (
            <a
              href={socialLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand hover:underline"
            >
              {socialLink.label}
            </a>
          ) : t.email ? (
            <span className="text-xs text-muted-foreground">{t.email}</span>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground/80">{t.message}</p>
    </div>
  )
}
