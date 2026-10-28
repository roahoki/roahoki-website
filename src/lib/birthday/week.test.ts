import { describe, expect, it } from "vitest";
import { BIRTHDAY_EVENTS, eventsFor } from "./events";
import { birthdayWeek } from "./week";

describe("birthdayWeek", () => {
  it("es la semana del lunes 2 al domingo 8 de noviembre", () => {
    const week = birthdayWeek(BIRTHDAY_EVENTS);
    expect(week.map((day) => day.letter).join("")).toBe("LMXJVSD");
    expect(week.map((day) => day.date)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("pone cada plan en el día en que empieza", () => {
    const week = birthdayWeek(BIRTHDAY_EVENTS);
    const slugs = week.map((day) => day.plans.map((plan) => plan.slug));
    expect(slugs).toEqual([
      [],
      [],
      ["cocktail"],
      [],
      [],
      // El carrete termina el domingo a las 05:00, pero es del sábado.
      ["run", "party"],
      ["hike"],
    ]);
  });

  it("sin cóctel, la semana es la misma y el miércoles queda vacío", () => {
    const week = birthdayWeek(eventsFor(["run", "party", "hike"]));
    expect(week[0].date).toBe(2);
    expect(week[2].plans).toEqual([]);
  });

  it("sin planes no hay semana", () => {
    expect(birthdayWeek([])).toEqual([]);
  });
});
