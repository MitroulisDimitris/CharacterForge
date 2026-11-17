// Rolled ability scores (feedback: "roll one by one and put each roll on an ability yourself"):
// six rolls of 4d6, each rolled on its own; the lowest die is dropped; the player assigns rolls.
import { ABILITIES, type Ability } from "./data/core";
import type { Character } from "./character";

export const ROLL_COUNT = 6;

/** Four d6, highest first (the last one is the one dropped). */
export function roll4d6(rnd: () => number = Math.random): number[] {
  return Array.from({ length: 4 }, () => 1 + Math.floor(rnd() * 6)).sort((a, b) => b - a);
}

/** 4d6 drop the lowest. */
export const rollTotal = (dice: number[]) => [...dice].sort((a, b) => b - a).slice(0, 3).reduce((s, x) => s + x, 0);

/** Base scores from the rolls and where they're put (an ability without a roll stays at 10). */
export function baseFromRolls(rolls: number[][], rollFor: Partial<Record<Ability, number>>): Character["base"] {
  return Object.fromEntries(ABILITIES.map((a) => [a, rollFor[a] != null && rolls[rollFor[a]!] ? rollTotal(rolls[rollFor[a]!]) : 10])) as Character["base"];
}

/** Put roll `i` on ability `a`; if another ability had it, that one gets `a`'s old roll (a swap). */
export function assignRoll(rollFor: Partial<Record<Ability, number>>, a: Ability, i: number | undefined): Partial<Record<Ability, number>> {
  const next = { ...rollFor };
  const old = next[a];
  const holder = i == null ? undefined : ABILITIES.find((x) => x !== a && next[x] === i);
  if (i == null) delete next[a];
  else next[a] = i;
  if (holder) {
    if (old == null) delete next[holder];
    else next[holder] = old;
  }
  return next;
}

export const assignedCount = (c: Pick<Character, "rolls" | "rollFor">) => ABILITIES.filter((a) => c.rollFor?.[a] != null && c.rolls?.[c.rollFor[a]!]).length;
