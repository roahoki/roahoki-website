"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"

export function SidebarNav() {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: "/" as const, label: t("about") },
    { href: "/experience" as const, label: t("experience") },
    { href: "/projects" as const, label: t("projects") },
  ]

  const toggleLocale = () => {
    const newLocale = locale === "es" ? "en" : "es"
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <nav className="flex flex-row gap-4 px-6 py-6 text-sm md:flex-col md:items-end md:gap-1 md:px-0 md:pr-8 md:pt-12">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`transition-colors hover:text-foreground ${
              isActive ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        )
      })}

      <button
        type="button"
        onClick={toggleLocale}
        className="text-muted-foreground hover:text-foreground transition-colors mt-2 md:mt-4 text-xs uppercase tracking-wide"
      >
        {locale === "es" ? "EN" : "ES"}
      </button>
    </nav>
  )
}
