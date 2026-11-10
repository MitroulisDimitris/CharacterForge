// What a 5e character uses up in play (tracked with tappable pips, refilled by rests).
import type { ResourcePool } from "../types";
import type { Character } from "./character";
import type { Derived } from "./derive";

const ord = (n: number) => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
/** Pools tracked in play: spell slots (warlock pact slots refill on a short rest) and sorcery points. */
export const resources5e = (_c: Character, d: Derived): ResourcePool[] => [
  ...d.slots.flatMap((n, i) =>
    n ? [{ id: `slot${i + 1}`, label: d.pact ? `Pact slots (${ord(i + 1)})` : `${ord(i + 1)}-level slots`, max: n, refresh: d.pact ? ("short" as const) : ("long" as const), kind: "slot" as const }] : [],
  ),
  ...(d.sorceryPoints ? [{ id: "sorcery", label: "Sorcery points", max: d.sorceryPoints, refresh: "long" as const, kind: "points" as const }] : []),
];
