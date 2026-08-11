import Image from "next/image";
import type { Testimonial } from "@/db/schema";

// El tipo se deriva del esquema, no se escribe a mano: si mañana se agrega una
// columna o cambia un nullable, esto lo acompaña solo. Se re-exporta porque los
// componentes que muestran testimonios ya lo importaban desde acá.
export type { Testimonial };

export function TestimonialCard({ t }: { t: Testimonial }) {
  const initials = t.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const socialLink = t.linkedinUrl
    ? { href: t.linkedinUrl, label: "LinkedIn" }
    : t.githubUsername
      ? {
          href: `https://github.com/${t.githubUsername}`,
          label: `@${t.githubUsername}`,
        }
      : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3 mb-3">
        {t.imageUrl ? (
          <Image
            src={t.imageUrl}
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
  );
}
