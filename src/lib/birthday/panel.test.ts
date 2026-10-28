import { describe, expect, it } from "vitest";
import {
  dotState,
  goingLabel,
  pendingCount,
  splitByPending,
  summarize,
  visitLabel,
} from "./panel";
import type { GuestWithRsvps } from "./queries";

function guest(
  name: string,
  invitedEvents: GuestWithRsvps["invitedEvents"],
  rsvps: GuestWithRsvps["rsvps"] = {},
): GuestWithRsvps {
  return {
    id: name,
    name,
    token: "Ab3dEf6hIj9L",
    personalMessage: null,
    phone: null,
    invitedEvents,
    roki: null,
    scratchedAt: null,
    firstSeenAt: null,
    lastSeenAt: null,
    createdAt: "2026-10-28T00:00:00Z",
    rsvps,
  };
}

const cata = guest("cata", ["run", "party", "hike"], { run: "going" });
const nico = guest("nico", ["cocktail", "run", "party", "hike"], {
  cocktail: "going",
  run: "not_going",
  party: "going",
  hike: "going",
});

describe("cuentas del panel", () => {
  it("distingue no invitado de sin responder", () => {
    expect(dotState(cata, "cocktail")).toBe("not_invited");
    expect(dotState(cata, "party")).toBe("pending");
    expect(dotState(cata, "run")).toBe("going");
  });

  it("cuenta solo a los invitados de cada plan", () => {
    const [cocktail, run, party] = summarize([cata, nico]);
    expect(cocktail).toEqual({
      slug: "cocktail",
      going: 1,
      notGoing: 0,
      pending: 0,
    });
    expect(run).toEqual({ slug: "run", going: 1, notGoing: 1, pending: 0 });
    expect(party).toEqual({ slug: "party", going: 1, notGoing: 0, pending: 1 });
  });

  it("pone primero a quien le falta responder algo", () => {
    expect(pendingCount(cata)).toBe(2);
    const { pending, done } = splitByPending([nico, cata]);
    expect(pending.map((g) => g.name)).toEqual(["cata"]);
    expect(done.map((g) => g.name)).toEqual(["nico"]);
  });

  it("dice en qué va con su link", () => {
    expect(visitLabel({ firstSeenAt: null, scratchedAt: null })).toBe(
      "no ha abierto el link",
    );
    expect(
      visitLabel({ firstSeenAt: "2026-10-29T10:00:00Z", scratchedAt: null }),
    ).toBe("abrió, sin raspar");
    expect(
      visitLabel({
        firstSeenAt: "2026-10-29T10:00:00Z",
        scratchedAt: "2026-10-29T10:01:00Z",
      }),
    ).toBe("raspó");
  });

  it("no dice 1 van", () => {
    expect(goingLabel(1)).toBe("1 va");
    expect(goingLabel(0)).toBe("0 van");
    expect(goingLabel(5)).toBe("5 van");
  });
});
