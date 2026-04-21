"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useRef } from "react"

const WHATSAPP = "https://wa.link/ht8ioc"

export function Navbar() {
  const t = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  function startPress() {
    didLongPress.current = false
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true
      window.location.href = "/admin/login"
    }, 1500)
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function handleThemeClick() {
    if (didLongPress.current) return
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleLocale = () => {
    router.replace(pathname, { locale: locale === "es" ? "en" : "es" })
  }

  const links = [
    { href: "#about", label: t("about") },
    { href: "#experience", label: t("experience") },
    { href: "#projects", label: t("projects") },
    { href: "#teaching", label: t("teaching") },
    { href: "#contact", label: t("contact") },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-6">
        <a
          href="#hero"
          className="font-extrabold text-sm text-foreground hover:text-brand transition-colors duration-150 shrink-0"
        >
          jp.
        </a>

        <nav className="hidden md:flex items-center gap-5 flex-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={toggleLocale}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-wide"
          >
            {locale === "es" ? "EN" : "ES"}
          </button>

          <button
            type="button"
            onClick={handleThemeClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>

          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block px-3.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150"
          >
            {t("cta")} →
          </a>
        </div>
      </div>
    </header>
  )
}
