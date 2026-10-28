import type { BirthdayEvent } from "./events";

/**
 * La semana del cumpleaños, de lunes a domingo, con los planes de cada día.
 * Reemplaza al `.ics`: en vez de descargar un archivo, se ve en qué días cae
 * cada plan.
 *
 * El día de un plan es el de su inicio en hora de Santiago (el carrete empieza
 * el sábado aunque termine el domingo). La semana es la del primer plan: los
 * cuatro caen en la misma.
 */

export type WeekDay = {
  /** Letra del día, de lunes a domingo: L M X J V S D. */
  letter: string;
  /** Día del mes. */
  date: number;
  /** Los planes que empiezan ese día, en orden cronológico. */
  plans: BirthdayEvent[];
};

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

// Noviembre en Santiago es -03:00 todo el mes (ver `hasPassed` en events.ts).
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** El instante corrido a la hora de Santiago, para leerlo con `getUTC*`. */
function santiago(iso: string): Date {
  return new Date(new Date(iso).getTime() - OFFSET_MS);
}

/** Medianoche (en la hora corrida) del día de un instante. */
function dayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function birthdayWeek(plans: readonly BirthdayEvent[]): WeekDay[] {
  if (plans.length === 0) return [];
  const first = santiago(plans[0].startsAt);
  // getUTCDay: domingo 0. Lunes de esa semana.
  const monday = dayStart(first) - ((first.getUTCDay() + 6) % 7) * DAY_MS;

  return LETTERS.map((letter, index) => {
    const start = monday + index * DAY_MS;
    return {
      letter,
      date: new Date(start).getUTCDate(),
      plans: plans.filter(
        (plan) => dayStart(santiago(plan.startsAt)) === start,
      ),
    };
  });
}
