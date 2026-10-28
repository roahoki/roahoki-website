import { X } from "lucide-react";
import type { DotState } from "@/lib/birthday/panel";

const LABELS: Record<DotState, string> = {
  going: "va",
  not_going: "no va",
  pending: "sin responder",
  not_invited: "no invitado",
};

/**
 * El puntito de un plan en la lista del panel: lleno si va, vacío si no ha
 * respondido, una equis si no va y nada si no está invitado. Siempre ocupa el
 * mismo ancho, para que las columnas de los planes queden alineadas.
 */
export function PlanDot({
  state,
  color,
  plan,
}: {
  state: DotState;
  color: string;
  plan: string;
}) {
  return (
    <span
      className="flex size-[22px] items-center justify-center"
      role="img"
      aria-label={`${plan}: ${LABELS[state]}`}
      title={`${plan}: ${LABELS[state]}`}
    >
      {state === "going" && (
        <span
          className="size-3.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {state === "pending" && (
        <span
          className="size-[13px] rounded-full border-[1.5px]"
          style={{ borderColor: color }}
        />
      )}
      {state === "not_going" && (
        <X
          className="size-4"
          strokeWidth={2.25}
          style={{ color }}
          aria-hidden
        />
      )}
    </span>
  );
}
