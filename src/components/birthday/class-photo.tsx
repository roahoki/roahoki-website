import Link from "next/link";
import type { Attendee } from "@/lib/birthday/queries";
import { RokiFigure } from "./roki-figure";

/**
 * La foto de curso: los rokis de quienes van, en grilla de a cuatro, con el
 * nombre abajo. La usan la página del invitado (dentro del carrusel de quiénes
 * van) y el panel, donde es la forma más rápida de revisar quién va.
 *
 * Sin estado propio, así que sirve igual desde un Server Component (el panel)
 * que desde uno de cliente (el carrusel).
 */
export function ClassPhoto({
  attendees,
  color,
  meId,
  onTapMine,
  hrefFor,
  ...rest
}: {
  attendees: Attendee[];
  color: string;
  /** En la página del invitado: su roki dice "tú" y se toca para redibujarlo. */
  meId?: string;
  onTapMine?: () => void;
  /** En el panel: cada roki lleva a la ficha del invitado. */
  hrefFor?: (attendee: Attendee) => string;
} & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      {...rest}
      className={`grid grid-cols-4 content-start gap-x-2 gap-y-4 ${rest.className ?? ""}`}
    >
      {attendees.map((attendee) => {
        const me = attendee.id === meId;
        const figure = (
          <>
            <RokiFigure
              roki={attendee.roki}
              color={color}
              size={64}
              label={me ? "tu roki" : `el roki de ${attendee.name}`}
            />
            <span className="max-w-full truncate text-card-meta">
              {me ? "tú" : attendee.name}
            </span>
          </>
        );
        const cell = "flex max-w-full flex-col items-center gap-1";
        return (
          <li key={attendee.id} className="flex flex-col items-center gap-1">
            {me && onTapMine ? (
              <button
                type="button"
                onClick={onTapMine}
                className={cell}
                aria-label={
                  attendee.roki ? "redibujar tu roki" : "dibujar tu roki"
                }
              >
                {figure}
              </button>
            ) : hrefFor ? (
              <Link href={hrefFor(attendee)} className={cell}>
                {figure}
              </Link>
            ) : (
              figure
            )}
          </li>
        );
      })}
    </ul>
  );
}
