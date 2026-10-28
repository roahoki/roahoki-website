import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { RsvpStatus } from "@/db/schema";
import type { BirthdayEvent } from "@/lib/birthday/events";
import { formatDayTime } from "@/lib/birthday/format";

const STATUS: Record<RsvpStatus | "pending", string> = {
  going: "vas",
  not_going: "no vas",
  pending: "por confirmar",
};

/**
 * Un plan en el lineup del invitado (Figma: `cumple/plan-tarjeta`): la tarjeta
 * entera en el color del plan, con una flecha en un círculo papel para que se
 * entienda de inmediato que se toca.
 */
export function PlanCard({
  token,
  plan,
  status,
}: {
  token: string;
  plan: BirthdayEvent;
  status: RsvpStatus | undefined;
}) {
  const state = status ?? "pending";
  const going = state === "going";

  return (
    <Link
      href={`/cumple/${token}/${plan.path}`}
      className="flex flex-col gap-0.5 rounded-[20px] px-5 pt-[18px] pb-[18px] text-paper transition-transform active:scale-[0.98]"
      style={{ backgroundColor: plan.color }}
    >
      <span className="text-entry-meta">{formatDayTime(plan.startsAt)}</span>
      <span className="text-[3.5rem] leading-[1.1] font-bold tracking-[-0.02em]">
        {plan.title}
      </span>
      <span className="mt-1 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-paper px-3 py-1.5 text-card-meta"
          style={
            going
              ? { backgroundColor: "var(--paper)", color: plan.color }
              : undefined
          }
        >
          {going && <Check className="size-4" aria-hidden />}
          {STATUS[state]}
        </span>
        <span className="flex size-[52px] items-center justify-center rounded-full bg-paper">
          <ArrowRight
            className="size-6"
            style={{ color: plan.color }}
            aria-hidden
          />
          <span className="sr-only">ver el {plan.title}</span>
        </span>
      </span>
    </Link>
  );
}
