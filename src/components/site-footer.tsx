import { GITHUB_URL, INSTAGRAM_URL, LINKEDIN_URL } from "@/lib/profile";

const LINKS = [
  { label: "instagram", href: INSTAGRAM_URL },
  { label: "github", href: GITHUB_URL },
  { label: "linkedin", href: LINKEDIN_URL },
] as const;

/**
 * Footer del sitio con la marca nueva: la firma a la izquierda y los perfiles
 * a la derecha. El `:)` va en el color del acento, como en el cierre de cada
 * entrada (brand book §5.2).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="flex items-baseline justify-between gap-6 px-4 py-6 md:px-8 md:py-7">
        <p className="text-body text-ink">
          roahoki <span className="text-leaf">:)</span>
        </p>
        <ul className="flex gap-5 md:gap-6">
          {LINKS.map(({ label, href }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-action text-leaf underline-offset-4 hover:underline focus-visible:underline"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
