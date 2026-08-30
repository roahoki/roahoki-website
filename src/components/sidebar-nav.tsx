"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

export function SidebarNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Sobre mí" },
    { href: "/experience", label: "Experiencia" },
    { href: "/projects", label: "Proyectos" },
    { href: "/teaching", label: "Clases" },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="flex flex-row flex-wrap gap-x-5 gap-y-2 px-5 py-5 text-sm md:flex-col md:items-end md:gap-1 md:px-0 md:pr-8 md:pt-12">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative transition-colors duration-200 ${
              isActive
                ? "font-semibold text-brand"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-brand" />
            )}
          </Link>
        );
      })}

      <div className="flex items-center gap-3 mt-1 md:mt-4 md:flex-col md:items-end md:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </nav>
  );
}
